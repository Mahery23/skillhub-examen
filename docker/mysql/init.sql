-- Crée la base authdb si elle n'existe pas
CREATE DATABASE IF NOT EXISTS authdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Donne tous les droits à skillhub_user sur authdb
GRANT ALL PRIVILEGES ON authdb.* TO 'skillhub_user'@'%';

FLUSH PRIVILEGES;