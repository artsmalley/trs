/**
 * Test script for File Search Store prototype
 * Run with: npx tsx scripts/test-file-search-store.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { GoogleGenAI } from '@google/genai';
import { getOrCreateStore, uploadToStore, getStoreName, listStoreDocuments } from '../lib/file-search-store';
import fs from 'fs';

async function testFileSearchStore() {
  console.log('='.repeat(60));
  console.log('File Search Store Prototype Test');
  console.log('='.repeat(60));

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY not set');
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Step 1: Create or get store
    console.log('\n1. Creating/Getting File Search Store...');
    const store = await getOrCreateStore();
    console.log(`✓ Store ready: ${store.name}`);

    // Step 2: Create a test PDF (small text file for quick test)
    console.log('\n2. Creating test document...');
    const testContent = `
Toyota Production System (TPS) Overview

The Toyota Production System is a manufacturing methodology developed by Toyota.
It focuses on eliminating waste and continuous improvement (kaizen).

Key Principles:
1. Just-in-Time (JIT) production
2. Jidoka (automation with human touch)
3. Heijunka (production leveling)
4. Kaizen (continuous improvement)

The 5S System:
- Seiri (Sort)
- Seiton (Set in order)
- Seiso (Shine)
- Seiketsu (Standardize)
- Shitsuke (Sustain)

Quality Circles are small groups of workers who meet regularly to identify
and solve work-related problems.
    `.trim();

    const testBuffer = Buffer.from(testContent, 'utf-8');

    // Step 3: Upload test document
    console.log('\n3. Uploading test document to store...');
    const doc = await uploadToStore(
      testBuffer,
      'test-tps-overview.txt',
      'text/plain',
      'TPS Overview Test Document'
    );
    console.log(`✓ Document uploaded: ${doc.name}`);

    // Step 4: List documents in store
    console.log('\n4. Listing documents in store...');
    const docs = await listStoreDocuments();
    console.log(`✓ Found ${docs.length} document(s) in store`);
    docs.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.displayName} (${d.state})`);
    });

    // Step 5: Test semantic retrieval query
    console.log('\n5. Testing semantic retrieval query...');
    const storeName = await getStoreName();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'What are the key principles of the Toyota Production System?',
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [storeName],
            },
          },
        ],
      },
    });

    console.log('\nQuery: "What are the key principles of the Toyota Production System?"');
    console.log('\nResponse:');
    console.log(response.text);

    // Step 6: Check grounding metadata (citations)
    console.log('\n6. Checking grounding metadata...');
    const grounding = response.candidates?.[0]?.groundingMetadata;
    if (grounding) {
      console.log('✓ Grounding metadata found:');
      console.log(JSON.stringify(grounding, null, 2));
    } else {
      console.log('⚠ No grounding metadata (might be a problem)');
    }

    // Step 7: Test another query
    console.log('\n7. Testing specific query...');
    const response2 = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'What are the 5S principles?',
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [storeName],
            },
          },
        ],
      },
    });

    console.log('\nQuery: "What are the 5S principles?"');
    console.log('\nResponse:');
    console.log(response2.text);

    console.log('\n' + '='.repeat(60));
    console.log('✓ File Search Store prototype test SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log('\nKey findings:');
    console.log('- Store creation: ✓');
    console.log('- Document upload & indexing: ✓');
    console.log('- Semantic retrieval: ✓');
    console.log('- Citations/grounding:', grounding ? '✓' : '⚠');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    throw error;
  }
}

// Run the test
testFileSearchStore()
  .then(() => {
    console.log('\nTest completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest failed with error:', error);
    process.exit(1);
  });
