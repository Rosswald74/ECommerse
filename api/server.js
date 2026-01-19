const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Koneksi Database
const sslCaPemRaw = String(process.env.DB_SSL_CA_PEM || "");
const sslCaPath = String(process.env.DB_SSL_CA || "").trim();

const sslConfig = sslCaPemRaw.trim()
  ? {
      // Vercel env var often stores newlines as \n
      ca: sslCaPemRaw.replace(/\\n/g, "\n"),
      rejectUnauthorized: true,
    }
  : sslCaPath
    ? {
        ca: fs.readFileSync(sslCaPath),
        rejectUnauthorized: true,
      }
    : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 4000),
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Quick connectivity check (won't crash server on failure)
pool.getConnection((err, conn) => {
  if (err) {
    console.error("❌ Koneksi DB gagal:", err.message || err);
    return;
  }
  conn.release();
  console.log("✔ Terhubung ke database (pool ready)");
});

async function withTransaction(work) {
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      // ignore rollback errors
    }
    throw err;
  } finally {
    conn.release();
  }
}

// ================== Helper Functions ==================

function isValidEmail(value) {
  const v = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function toPositiveInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i <= 0) return null;
  return i;
}

// ================== CRUD API ==================

// Health check for Vercel + DB connectivity
app.get(["/health", "/api/health"], async (req, res) => {
  try {
    const [rows] = await pool.promise().query("SELECT 1 AS ok");
    res.json({ ok: true, db: true, rows });
  } catch (err) {
    res.status(500).json({
      ok: false,
      db: false,
      message: "DB connection failed",
      error: {
        code: err && err.code,
        message: err && err.message,
      },
    });
  }
});

// CREATE - Insert Data Baru
app.post("/customer/create", (req, res) => {
  const { username, email, password } = req.body;
  const errors = {};
  const u = String(username || "").trim();
  const e = String(email || "").trim();
  const p = String(password || "").trim();

  if (!u) errors.username = "Username wajib diisi.";
  else if (u.length < 3) errors.username = "Username minimal 3 karakter.";

  if (!e) errors.email = "Email wajib diisi.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    errors.email = "Format email tidak valid.";

  if (!p) errors.password = "Password wajib diisi.";
  else if (p.length < 6) errors.password = "Password minimal 6 karakter.";

  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Periksa input register.", errors });
  }

  // optional guard: prevent duplicate emails (friendlier than raw SQL error)
  pool.query(
    "SELECT user_id FROM customer WHERE email = ? LIMIT 1",
    [e],
    (checkErr, checkRows) => {
      if (checkErr) {
        return res
          .status(500)
          .json({ message: "Gagal cek email", error: checkErr });
      }

      if (Array.isArray(checkRows) && checkRows.length) {
        return res.status(409).json({
          message: "Email sudah terdaftar.",
          errors: { email: "Email sudah terdaftar." },
        });
      }

      const sql =
        "INSERT INTO customer (username, email, password) VALUES (?, ?, ?)";
      pool.query(sql, [u, e, p], (err) => {
        if (err)
          return res.status(500).json({ message: "Gagal insert", error: err });
        res.status(201).json({ message: "Customer baru tersimpan." });
      });
    },
  );
});

// LOGIN - Validasi email + password
app.post("/customer/login", (req, res) => {
  const { email, password } = req.body;
  const errors = {};
  const e = String(email || "").trim();
  const p = String(password || "").trim();

  if (!e) errors.email = "Email wajib diisi.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    errors.email = "Format email tidak valid.";

  if (!p) errors.password = "Password wajib diisi.";

  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Periksa input login.", errors });
  }

  const sql =
    "SELECT user_id, username, email FROM customer WHERE email = ? AND password = ? LIMIT 1";
  pool.query(sql, [e, p], (err, results) => {
    if (err)
      return res.status(500).json({ message: "Gagal login", error: err });

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    res.json({ message: "Login berhasil.", user: results[0] });
  });
});

// CREATE ORDER + ITEMS + PAYMENT (transactional)
app.post("/orders", async (req, res) => {
  const { userId, deliveryMethod, deliveryAddress, items, paymentMethod } =
    req.body || {};

  const errors = {};
  const uid = toPositiveInt(userId);
  if (!uid) errors.userId = "User tidak valid.";

  const method = String(deliveryMethod || "").trim();
  if (method !== "address" && method !== "pickup") {
    errors.deliveryMethod = "Metode delivery tidak valid.";
  }

  const addr = String(deliveryAddress || "").trim();
  if (method === "address" && !addr) {
    errors.deliveryAddress = "Alamat pengiriman wajib diisi.";
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.items = "Item order kosong.";
  }

  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Periksa input order.", errors });
  }

  // Normalize items: allow productId OR name, quantity optional.
  const normalizedItems = [];
  for (const raw of items) {
    const productId =
      raw && raw.productId != null ? toPositiveInt(raw.productId) : null;
    const name = String((raw && raw.name) || "").trim();
    const quantityRaw = raw && raw.quantity != null ? raw.quantity : 1;
    const quantity = toPositiveInt(quantityRaw) || 1;

    if (!productId && !name) {
      return res.status(400).json({
        message: "Item tidak valid.",
        errors: { items: "Setiap item harus memiliki productId atau name." },
      });
    }

    normalizedItems.push({ productId, name, quantity });
  }

  // Combine duplicates (by productId if available, else by name)
  const combined = new Map();
  for (const it of normalizedItems) {
    const key = it.productId
      ? `id:${it.productId}`
      : `name:${it.name.toLowerCase()}`;
    const cur = combined.get(key) || {
      productId: it.productId,
      name: it.name,
      quantity: 0,
    };
    cur.quantity += it.quantity;
    combined.set(key, cur);
  }

  const payment = String(paymentMethod || "qr").trim() || "qr";

  try {
    const result = await withTransaction(async (conn) => {
      const q = async (sql, params = []) => {
        const [rows] = await conn.promise().query(sql, params);
        return rows;
      };

      const userRows = await q(
        "SELECT user_id FROM customer WHERE user_id = ? LIMIT 1",
        [uid],
      );
      if (!Array.isArray(userRows) || userRows.length === 0) {
        return { http: 404, body: { message: "User tidak ditemukan." } };
      }

      const resolvedProducts = [];

      for (const entry of combined.values()) {
        let productRow = null;
        if (entry.productId) {
          const rows = await q(
            "SELECT produk_id, nama, harga FROM produk WHERE produk_id = ? LIMIT 1",
            [entry.productId],
          );
          productRow = Array.isArray(rows) && rows.length ? rows[0] : null;
        } else {
          const rows = await q(
            "SELECT produk_id, nama, harga FROM produk WHERE nama = ? LIMIT 1",
            [entry.name],
          );
          productRow = Array.isArray(rows) && rows.length ? rows[0] : null;
        }

        if (!productRow) {
          return {
            http: 404,
            body: {
              message: "PRODUK HABIS.",
              errors: {
                items: `Produk tidak ditemukan: ${entry.name || entry.productId}`,
              },
            },
          };
        }

        const pid = toPositiveInt(productRow.produk_id);
        const unitPrice = Number(productRow.harga) || 0;
        const qty = toPositiveInt(entry.quantity) || 1;

        // Lock stock row and validate availability
        const stockRows = await q(
          "SELECT itemTersedia FROM stok WHERE produk_id = ? FOR UPDATE",
          [pid],
        );
        if (!Array.isArray(stockRows) || stockRows.length === 0) {
          return {
            http: 409,
            body: {
              message: "Stok produk tidak tersedia.",
              errors: {
                items: `Stok belum diset untuk produk: ${productRow.nama}`,
              },
            },
          };
        }

        const available = Number(stockRows[0].itemTersedia) || 0;
        if (available < qty) {
          return {
            http: 409,
            body: {
              message: "Stok tidak mencukupi.",
              errors: {
                items: `Stok tidak cukup untuk ${productRow.nama}. Tersedia: ${available}, diminta: ${qty}.`,
              },
            },
          };
        }

        // Decrement stock
        await q(
          "UPDATE stok SET itemTersedia = itemTersedia - ?, tglUpdateItem = NOW() WHERE produk_id = ?",
          [qty, pid],
        );

        resolvedProducts.push({
          produkId: pid,
          name: String(productRow.nama || entry.name || "Produk"),
          unitPrice,
          quantity: qty,
          lineTotal: unitPrice * qty,
        });
      }

      const totalAmount = resolvedProducts.reduce(
        (sum, p) => sum + (Number(p.lineTotal) || 0),
        0,
      );

      const orderResult = await q(
        "INSERT INTO orders (user_id, delivery_method, delivery_address, total_amount, status) VALUES (?, ?, ?, ?, ?)",
        [uid, method, method === "address" ? addr : null, totalAmount, "PAID"],
      );

      const orderId =
        orderResult && orderResult.insertId ? orderResult.insertId : null;
      if (!orderId) {
        throw new Error("Gagal membuat order_id");
      }

      for (const p of resolvedProducts) {
        await q(
          "INSERT INTO order_items (order_id, produk_id, product_name_snapshot, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?)",
          [orderId, p.produkId, p.name, p.unitPrice, p.quantity, p.lineTotal],
        );
      }

      await q(
        "INSERT INTO payments (order_id, method, amount, status, paid_at, metadata) VALUES (?, ?, ?, ?, NOW(), ?)",
        [
          orderId,
          payment,
          totalAmount,
          "PAID",
          JSON.stringify({ source: "web", deliveryMethod: method }),
        ],
      );

      return {
        http: 201,
        body: {
          message: "Order berhasil tersimpan.",
          orderId,
          totalAmount,
          itemsCount: resolvedProducts.reduce(
            (n, p) => n + (p.quantity || 0),
            0,
          ),
        },
      };
    });

    res.status(result.http).json(result.body);
  } catch (err) {
    res.status(500).json({ message: "Gagal menyimpan order.", error: err });
  }
});

// READ - Tampilkan Semua Akun Customer
app.get("/customer", (req, res) => {
  const sql =
    "SELECT user_id, username, email, password, tanggalDibuat FROM customer ORDER BY user_id DESC";
  pool.query(sql, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal mengambil data!", error: err });
    res.json(results);
  });
});

// READ - Tampilkan Semua Produk
app.get("/produk", (req, res) => {
  const sql =
    "SELECT produk_id, nama, deskripsi, harga, jumlahItem FROM produk ORDER BY produk_id DESC";
  pool.query(sql, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal mengambil data produk!", error: err });
    res.json(results);
  });
});

// READ - Tampilkan Semua Stok
app.get("/stok", (req, res) => {
  const sql =
    "SELECT stok_id, produk_id, itemTersedia, tglUpdateItem FROM stok ORDER BY stok_id DESC";
  pool.query(sql, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal mengambil data stok!", error: err });
    res.json(results);
  });
});

// READ - Tampilkan Semua Order
app.get("/orders", (req, res) => {
  const sql =
    "SELECT order_id, user_id, delivery_method, delivery_address, total_amount, status, created_at FROM orders ORDER BY order_id DESC";
  pool.query(sql, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Gagal mengambil data order!", error: err });
    res.json(results);
  });
});

// Hapus AKUN CUSTOMER
app.get("/customer/delete/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM customer WHERE user_id = ?";
  pool.query(sql, [id], (err, result) => {
    if (err)
      return res.status(500).json({ message: "Gagal hapus!", error: err });
    res.json({ message: "Data berhasil dihapus!" });
  });
});

// ================== RUN SERVER ==================
if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 Server jalan di http://localhost:${port}`);
  });
}

module.exports = app;
