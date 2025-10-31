const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection with better error handling
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fwrcfn';

console.log('Attempting to connect to MongoDB...');

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('✅ Database: fwrcfn');
    console.log('✅ Server is ready to accept requests');
})
.catch(err => {
    console.log('❌ MongoDB connection error:', err.message);
    console.log('💡 TIP: Make sure MongoDB is running on your system');
    console.log('💡 Run: mongod --dbpath "C:\\data\\db" or start MongoDB service');
});

// Basic route to test if server is working
app.get('/', (req, res) => {
    res.json({ 
        message: 'FWRCFN Backend is running!',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'user', 'volunteer', 'donor'], 
        default: 'user' 
    },
    phone: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Community Fridge Schema
const fridgeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true }
    },
    description: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Fridge = mongoose.model('Fridge', fridgeSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'fwrcfn_jwt_secret_2024';

// Test route without MongoDB dependency
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'Server is running',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.post('/api/register', async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ message: 'Database not connected' });
        }

        const { name, email, password, role, phone } = req.body;
        
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Create new user
        user = new User({
            name,
            email,
            password: await bcrypt.hash(password, 10),
            role: role || 'user',
            phone
        });
        
        await user.save();
        
        // Create JWT token
        const payload = { user: { id: user.id, role: user.role } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.post('/api/login', async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ message: 'Database not connected' });
        }

        const { email, password } = req.body;
        
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Create JWT token
        const payload = { user: { id: user.id, role: user.role } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get all fridges
app.get('/api/fridges', async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ message: 'Database not connected' });
        }

        const fridges = await Fridge.find({ isActive: true });
        res.json(fridges);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Add sample fridges
app.post('/api/sample-data', async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ message: 'Database not connected' });
        }

        // Create sample fridges
        const sampleFridges = [
            {
                name: "Community Center Fridge",
                address: {
                    street: "123 Main Street",
                    city: "New York",
                    state: "NY"
                },
                description: "24/7 accessible community fridge"
            },
            {
                name: "Downtown Food Share",
                address: {
                    street: "456 Oak Avenue",
                    city: "New York",
                    state: "NY"
                },
                description: "Located near central park"
            }
        ];
        
        await Fridge.insertMany(sampleFridges);
        res.json({ message: "Sample data created successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Access the API at: http://localhost:${PORT}`);
    console.log(`📊 Check status at: http://localhost:${PORT}/api/status`);
});