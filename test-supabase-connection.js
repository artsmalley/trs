// Test Supabase connection (Phase 1 - Session 24)
// Run with: node test-supabase-connection.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🧪 Testing Supabase connection...\n');

  try {
    // Test 1: Insert test document
    console.log('1️⃣  Inserting test document...');
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        title: 'Test Document',
        citation_key: 'Test2025',
        blob_url: 'https://test.com/test.pdf',
        file_name: 'test.pdf',
        quality_tier: 2,
        tier_label: 'High Quality'
      })
      .select()
      .single();

    if (docError) throw new Error(`Document insert failed: ${docError.message}`);
    console.log(`   ✅ Document created with ID: ${doc.id}`);

    // Test 2: Insert test chunk with vector
    console.log('2️⃣  Inserting test chunk with vector embedding...');

    // Create a dummy 1536-dimensional vector (all 0.1)
    const dummyVector = Array(1536).fill(0.1);

    const { data: chunk, error: chunkError } = await supabase
      .from('chunks')
      .insert({
        document_id: doc.id,
        text: 'This is a test chunk of text.',
        page_number: 1,
        chunk_index: 0,
        embedding: dummyVector,
        token_count: 100
      })
      .select()
      .single();

    if (chunkError) throw new Error(`Chunk insert failed: ${chunkError.message}`);
    console.log(`   ✅ Chunk created with ID: ${chunk.id}`);

    // Test 3: Query the chunk back
    console.log('3️⃣  Querying chunk with document join...');
    const { data: results, error: queryError } = await supabase
      .from('chunks')
      .select(`
        id,
        text,
        page_number,
        documents (
          citation_key,
          title
        )
      `)
      .eq('id', chunk.id);

    if (queryError) throw new Error(`Query failed: ${queryError.message}`);
    console.log(`   ✅ Query successful: Found chunk for document "${results[0].documents.citation_key}"`);

    // Test 4: Test vector similarity search function
    console.log('4️⃣  Testing search_chunks function...');
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_chunks', {
        query_embedding: dummyVector,
        match_threshold: 0.5,
        match_count: 1
      });

    if (searchError) throw new Error(`Search function failed: ${searchError.message}`);
    console.log(`   ✅ Search function working: Found ${searchResults.length} result(s)`);
    if (searchResults.length > 0) {
      console.log(`      Similarity score: ${searchResults[0].similarity.toFixed(4)}`);
    }

    // Test 5: Clean up test data
    console.log('5️⃣  Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);

    if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);
    console.log(`   ✅ Test data deleted (CASCADE removes chunk too)`);

    // Success!
    console.log('\n✅ All tests passed! Supabase is ready for Phase 2.\n');
    console.log('📊 Database status:');
    console.log('   - pgvector extension: ✅ Enabled');
    console.log('   - documents table: ✅ Working');
    console.log('   - chunks table: ✅ Working (with vector support)');
    console.log('   - search_chunks function: ✅ Working');
    console.log('   - Connection: ✅ Verified\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
