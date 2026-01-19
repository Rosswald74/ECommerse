-- TiDB Cloud Import Helper
--
-- Recommended approach (works even if you can't CREATE DATABASE):
USE `test`;
-- If you have permission to create your own DB, you can do:
-- CREATE DATABASE IF NOT EXISTS `ecommerse`;
-- USE `ecommerse`;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `customer` (
  `user_Id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `tanggalDibuat` timestamp NOT NULL DEFAULT (now()),
  `profile_photo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_Id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `produk` (
  `produk_id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(255) NOT NULL,
  `deskripsi` varchar(255) NOT NULL,
  `harga` decimal(20,6) NOT NULL DEFAULT (0),
  `jumlahItem` int NOT NULL,
  PRIMARY KEY (`produk_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `stok` (
  `stok_id` int NOT NULL AUTO_INCREMENT,
  `produk_id` int NOT NULL,
  `itemTersedia` int NOT NULL,
  `tglUpdateItem` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`stok_id`),
  UNIQUE KEY `produk_id_uniq` (`produk_id`),
  KEY `produk_id` (`produk_id`),
  CONSTRAINT `FK_stok_produk` FOREIGN KEY (`produk_id`) REFERENCES `produk` (`produk_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `order_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `delivery_method` enum('address','pickup') NOT NULL,
  `delivery_address` varchar(255) DEFAULT NULL,
  `total_amount` decimal(20,6) NOT NULL DEFAULT '0.000000',
  `status` enum('PENDING','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  KEY `idx_orders_user_created` (`user_id`,`created_at`),
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`user_id`) REFERENCES `customer` (`user_Id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `order_item_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `produk_id` int NOT NULL,
  `product_name_snapshot` varchar(255) NOT NULL,
  `unit_price` decimal(20,6) NOT NULL DEFAULT '0.000000',
  `quantity` int NOT NULL DEFAULT '1',
  `line_total` decimal(20,6) NOT NULL DEFAULT '0.000000',
  PRIMARY KEY (`order_item_id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_produk` (`produk_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_items_produk` FOREIGN KEY (`produk_id`) REFERENCES `produk` (`produk_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `method` varchar(32) NOT NULL,
  `amount` decimal(20,6) NOT NULL DEFAULT '0.000000',
  `status` enum('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata` json DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `idx_payments_order` (`order_id`),
  KEY `idx_payments_status_created` (`status`,`created_at`),
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Optional UI tables (not used by API, but kept from your dump)
CREATE TABLE IF NOT EXISTS `ui katalog` (
  `listProduk` varchar(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `ui keranjang` (
  `keranjang_id` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`keranjang_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
