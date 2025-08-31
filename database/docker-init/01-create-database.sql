-- Docker Database Initialization Script 1: Create Database
-- MS SQL Server Database Creation for Persona AI Link
-- This script creates the main database and sets up basic configuration

USE master;
GO

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'PersonaAILink')
BEGIN
    CREATE DATABASE PersonaAILink
    COLLATE SQL_Latin1_General_CP1_CI_AS;
    PRINT 'Database PersonaAILink created successfully';
END
ELSE
BEGIN
    PRINT 'Database PersonaAILink already exists';
END
GO

-- Switch to the new database
USE PersonaAILink;
GO

-- Set database options for better performance and compatibility
ALTER DATABASE PersonaAILink SET RECOVERY SIMPLE;
ALTER DATABASE PersonaAILink SET AUTO_CLOSE OFF;
ALTER DATABASE PersonaAILink SET AUTO_SHRINK OFF;
ALTER DATABASE PersonaAILink SET AUTO_CREATE_STATISTICS ON;
ALTER DATABASE PersonaAILink SET AUTO_UPDATE_STATISTICS ON;
GO

PRINT 'Database PersonaAILink initialized and configured for Docker deployment';
GO