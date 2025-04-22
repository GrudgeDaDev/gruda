const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Parse = require('parse/node');
const Web3 = require('web3');
const app = express();

// Supabase setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Parse setup
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY);
Parse.serverURL = process.env.PARSE_SERVER_URL;

// Web3 setup
const web3 = new Web3(process.env.SEPOLIA_RPC_URL);
const contractABI = require('./artifacts/contracts/GRUDA.sol/GRUDA.json').abi;
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new web3.eth.Contract(contractABI, contractAddress);

app.use(express.json());

// Example endpoint for card minting
app.post('/mint-card', async (req, res) => {
  const { userId, cardId } = req.body;
  try {
    // Interact with Supabase
    const { data, error } = await supabase
      .from('cards')
      .insert([{ userId, cardId, gbuxCost: 10 }]);
    if (error) throw error;

    // Interact with Parse (e.g., update Season0MintTracker)
    const MintTracker = Parse.Object.extend('Season0MintTracker');
    const query = new Parse.Query(MintTracker);
    const tracker = await query.first();
    tracker.increment('totalMinted');
    await tracker.save();

    // Interact with GRUDA contract
    const tx = await contract.methods.mintCard(userId, cardId).send({
      from: process.env.ADMIN_ADDRESS,
      gas: 200000
    });

    res.json({ success: true, transaction: tx });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
