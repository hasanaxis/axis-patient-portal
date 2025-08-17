#!/usr/bin/env node

// Standalone HL7 Server for Voyager RIS Integration
// Axis Imaging Patient Portal

import HL7Listener from './services/hl7-listener';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🏥 Axis Imaging HL7 Server for Voyager RIS Integration');
console.log('================================================');

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
  process.exit(1);
}

// Configuration
const HL7_PORT = parseInt(process.env.HL7_PORT || '2575');
const HL7_HOST = process.env.HL7_HOST || '0.0.0.0';

console.log(`📡 Configuration:`);
console.log(`   - HL7 Host: ${HL7_HOST}`);
console.log(`   - HL7 Port: ${HL7_PORT}`);
console.log(`   - Supabase URL: ${process.env.SUPABASE_URL}`);
console.log('');

// Create HL7 Listener
const hl7Listener = new HL7Listener();

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  try {
    await hl7Listener.stop();
    console.log('✅ HL7 Listener stopped successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the HL7 Server
async function startServer(): Promise<void> {
  try {
    console.log('🚀 Starting HL7 Listener...');
    await hl7Listener.start();
    
    console.log('✅ HL7 Server started successfully!');
    console.log('');
    console.log('📋 Server Status:');
    console.log(JSON.stringify(hl7Listener.getStatus(), null, 2));
    console.log('');
    console.log('🔌 Voyager RIS Configuration:');
    console.log(`   - Destination IP: ${HL7_HOST === '0.0.0.0' ? '[SERVER_IP]' : HL7_HOST}`);
    console.log(`   - Destination Port: ${HL7_PORT}`);
    console.log(`   - Protocol: TCP/IP`);
    console.log(`   - Message Types: ORU^R01, ORM^O01, ADT^A08`);
    console.log('');
    console.log('🎯 Ready to receive HL7 messages from Voyager RIS...');
    
  } catch (error) {
    console.error('❌ Failed to start HL7 Server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();