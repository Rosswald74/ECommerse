	-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.4.3 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for ecommerse
CREATE DATABASE `ecommerse` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `ecommerse`;

-- Dumping structure for table ecommerse.customer
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table ecommerse.customer: ~1 rows (approximately)
DELETE FROM `customer`;
INSERT INTO `customer` (`user_Id`, `username`, `email`, `password`, `tanggalDibuat`, `profile_photo`) VALUES
	(6, 'Rosswald', 'ross@gmail.com', 'asdfgh', '2026-01-01 05:08:48', NULL);

-- Dumping structure for table ecommerse.orders
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table ecommerse.orders: ~2 rows (approximately)
DELETE FROM `orders`;
INSERT INTO `orders` (`order_id`, `user_id`, `delivery_method`, `delivery_address`, `total_amount`, `status`, `created_at`) VALUES
	(4, 6, 'pickup', NULL, 165000.000000, 'PAID', '2026-01-01 05:09:33'),
	(5, 6, 'pickup', NULL, 165000.000000, 'PAID', '2026-01-01 05:22:20');

-- Dumping structure for table ecommerse.order_items
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table ecommerse.order_items: ~2 rows (approximately)
DELETE FROM `order_items`;
INSERT INTO `order_items` (`order_item_id`, `order_id`, `produk_id`, `product_name_snapshot`, `unit_price`, `quantity`, `line_total`) VALUES
	(5, 4, 4, 'Mac D Hat-Black', 165000.000000, 1, 165000.000000),
	(6, 5, 4, 'Mac D Hat-Black', 165000.000000, 1, 165000.000000);

-- Dumping structure for table ecommerse.payments
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table ecommerse.payments: ~2 rows (approximately)
DELETE FROM `payments`;
INSERT INTO `payments` (`payment_id`, `order_id`, `method`, `amount`, `status`, `paid_at`, `created_at`, `metadata`) VALUES
	(4, 4, 'qr', 165000.000000, 'PAID', '2026-01-01 05:09:33', '2026-01-01 05:09:33', '{"source": "web", "deliveryMethod": "pickup"}'),
	(5, 5, 'qr', 165000.000000, 'PAID', '2026-01-01 05:22:20', '2026-01-01 05:22:20', '{"source": "web", "deliveryMethod": "pickup"}');

-- Dumping structure for table ecommerse.produk
CREATE TABLE IF NOT EXISTS `produk` (
  `produk_id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(255) NOT NULL,
  `deskripsi` varchar(255) NOT NULL,
  `harga` decimal(20,6) NOT NULL DEFAULT (0),
  `jumlahItem` int NOT NULL,
  PRIMARY KEY (`produk_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table ecommerse.produk: ~4 rows (approximately)
DELETE FROM `produk`;
INSERT INTO `produk` (`produk_id`, `nama`, `deskripsi`, `harga`, `jumlahItem`) VALUES
	(1, 'Fursuit Kipas Portabel', 'Produk seed dari UI', 1030000.000000, 10),
	(2, 'Furhead Fan', 'Produk seed dari UI', 744000.000000, 10),
	(3, 'Mac D Hat-Red', 'Produk seed dari UI', 165000.000000, 10),
	(4, 'Mac D Hat-Black', 'Produk seed dari UI', 165000.000000, 10);

-- Dumping structure for table ecommerse.stok
CREATE TABLE IF NOT EXISTS `stok` (
  `stok_id` int NOT NULL AUTO_INCREMENT,
  `produk_id` int NOT NULL,
  `itemTersedia` int NOT NULL,
  `tglUpdateItem` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`stok_id`),
  UNIQUE KEY `produk_id_uniq` (`produk_id`),
  KEY `produk_id` (`produk_id`),
  CONSTRAINT `FK_stok_produk` FOREIGN KEY (`produk_id`) REFERENCES `produk` (`produk_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table ecommerse.stok: ~4 rows (approximately)
DELETE FROM `stok`;
INSERT INTO `stok` (`stok_id`, `produk_id`, `itemTersedia`, `tglUpdateItem`) VALUES
	(1, 1, 10, '2025-12-31 18:30:00'),
	(2, 2, 8, '2026-01-01 04:43:25'),
	(3, 3, 9, '2025-12-31 18:33:26'),
	(4, 4, 7, '2026-01-01 05:22:20');

-- Dumping structure for table ecommerse.ui katalog
CREATE TABLE IF NOT EXISTS `ui katalog` (
  `listProduk` varchar(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table ecommerse.ui katalog: ~0 rows (approximately)
DELETE FROM `ui katalog`;

-- Dumping structure for table ecommerse.ui keranjang
CREATE TABLE IF NOT EXISTS `ui keranjang` (
  `keranjang_id` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`keranjang_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table ecommerse.ui keranjang: ~0 rows (approximately)
DELETE FROM `ui keranjang`;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
