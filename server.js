const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Access levels for different roles
const ACCESS_LEVELS = {
    VIP: 'vip',           // See everything including private events
    FRIEND: 'friend',     // See public events only
};

// Valid access codes with roles
const VALID_CODES = {
    '011387': {
        guestName: 'Prathamesh Pawar',
        role: ACCESS_LEVELS.VIP
    },
    '120193': {
        guestName: 'Varshini and Kiran',
        role: ACCESS_LEVELS.VIP
    },
    '141097':{
        guestName: 'Terkar family',
        role: ACCESS_LEVELS.VIP
    },
    '042693':{
        guestName: 'Vedant Kawale',
        role: ACCESS_LEVELS.VIP
    },
    '150467':{
        guestName: 'Gayathri and Venkatesh',
        role: ACCESS_LEVELS.VIP
    },
    '042196':{
        guestName: 'Varsha and Sourabh',
        role: ACCESS_LEVELS.VIP
    },
    '070192':{
        guestName: 'Aishwarya',
        role: ACCESS_LEVELS.VIP
    },
    '030893': {
        guestName: 'Mohini and Ajinkya',
        role: ACCESS_LEVELS.VIP
    },
    '061193': {
        guestName: 'Estmeed Guest',
        role: ACCESS_LEVELS.VIP
    },
    '122092': {
        guestName: 'Manpreet and Niranjan',
        role: ACCESS_LEVELS.FRIEND
    },
    '022591': {
        guestName: 'Sowmya and Mohit',
        role: ACCESS_LEVELS.FRIEND
    },
    '110392': {
        guestName: 'Neha and Ameya',
        role: ACCESS_LEVELS.FRIEND
    },
    '041299': {
        guestName: 'Atharv Pawar',
        role: ACCESS_LEVELS.FRIEND
    },
    '091597': {
        guestName: 'Vaishnavi and Vedant',
        role: ACCESS_LEVELS.FRIEND
    },
    '090796': {
        guestName: 'Simran and Satnam',
        role: ACCESS_LEVELS.FRIEND
    },
    'PSDVIN': {
        guestName: 'Vinay Polisetty',
        role: ACCESS_LEVELS.FRIEND
    },
    'TDSCKS': {
        guestName: 'Keerthi Singri',
        role: ACCESS_LEVELS.FRIEND
    },
    'HOMIES': {
        guestName: 'Dear Guest',
        role: ACCESS_LEVELS.FRIEND
    },
    'PSDS25': {
        guestName: 'Dear Guest',
        role: ACCESS_LEVELS.FRIEND
    }
};

// Program schedule with access levels
const PROGRAM_SCHEDULE = [
    {
        time: '6:30 AM',
        activity: '📿 Puja Begins',
        accessLevel: 'vip' // Only family and VIP
    },
    {
        time: '11:15 AM',
        activity: '🫖 Light Refreshments',
        accessLevel: 'public' // Everyone can see
    },
     {
        time: '11:30 AM',
        activity: '🏠 House Tour & Blessings',
        accessLevel: 'public' // Everyone can see
    },
    {
        time: '12:30 PM - 2:00 PM',
        activity: '🍛 Lunch & Celebration',
        accessLevel: 'public' // Everyone can see
    }
];

// Store active sessions with tokens
const activeSessions = new Map();

// Generate secure random token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Validate token
function isValidToken(token) {
    return activeSessions.has(token);
}

// Filter schedule based on role
function filterScheduleByRole(role) {
    return PROGRAM_SCHEDULE.filter(item => {
        if (item.accessLevel === 'public') {
            return true; // Everyone sees public events
        }
        if (role === ACCESS_LEVELS.VIP) {
            return true; // VIP sees everything
        }
        return false; // Others don't see private events
    });
}

// API endpoint to verify access code
app.post('/api/verify', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                valid: false,
                message: 'Access code is required'
            });
        }

        const upperCode = code.trim().toUpperCase();

        if (VALID_CODES[upperCode]) {
            const userData = VALID_CODES[upperCode];
            const token = generateToken();
            
            // Store session with role
            activeSessions.set(token, {
                guestName: userData.guestName,
                role: userData.role,
                code: upperCode,
                createdAt: Date.now(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            });

            console.log(`✅ New session: ${userData.guestName} (${userData.role}) - Token: ${token.substring(0, 8)}...`);

            return res.json({
                valid: true,
                guestName: userData.guestName,
                token: token
            });
        }

        return res.json({
            valid: false,
            message: 'Invalid access code'
        });

    } catch (error) {
        console.error('Error verifying code:', error);
        return res.status(500).json({
            valid: false,
            message: 'Server error during verification'
        });
    }
});

// API endpoint to get ceremony details HTML
app.get('/api/details', (req, res) => {
    const token = req.headers.authorization;
    
    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No authentication token provided'
        });
    }

    if (!isValidToken(token)) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token'
        });
    }

    const session = activeSessions.get(token);
    if (Date.now() > session.expiresAt) {
        activeSessions.delete(token);
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Session expired. Please login again.'
        });
    }

    // Filter schedule based on user's role
    const userSchedule = filterScheduleByRole(session.role);
    
    console.log(`✅ Valid access: ${session.guestName} (${session.role}) - Showing ${userSchedule.length}/${PROGRAM_SCHEDULE.length} events`);

    // Generate schedule HTML based on filtered items
    const scheduleHTML = userSchedule.map(item => `
        <div class="schedule-item">
            <div class="time">${item.time}</div>
            <div class="activity">${item.activity}</div>
        </div>
    `).join('');

    // Add role-based message
    let roleMessage = '';
    if (session.role === ACCESS_LEVELS.VIP) {
        roleMessage = '<p style="color: #d84315; font-weight: 600; margin-bottom: 15px;">🌟 VIP Access - Full Schedule</p>';
    } 
    roleMessage += '<span style="color: #d84315; font-weight: 200; margin-bottom: 15px;">Timings in PST</span>';
    // Generate the HTML content
    const detailsHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Poppins:wght@300;400;600&display=swap');

            .header {
                background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%);
                border-radius: 25px;
                padding: 60px 50px;
                text-align: center;
                margin-bottom: 30px;
                box-shadow: 0 15px 50px rgba(0,0,0,0.2);
                border: 3px solid #ff6b35;
                position: relative;
                overflow: hidden;
                transform-style: preserve-3d;
                animation: cardFloat 6s ease-in-out infinite;
            }

           @keyframes cardFloat {
                0%, 100% { transform: translateY(0) rotateX(0deg); }
                50% { transform: translateY(-10px) rotateX(2deg); }
            }


            .header::before { left: 30px; }
            .header::after { right: 30px; animation-delay: 1.5s; }

            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.3; }
                50% { transform: scale(1.2); opacity: 0.5; }
            }

            .header h1 {
                color: #d84315;
                font-size: 3.2em;
                margin-bottom: 20px;
                font-family: 'Playfair Display', serif;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
                animation: titleShine 4s ease-in-out infinite;
            }

            @keyframes titleShine {
                0%, 100% { text-shadow: 2px 2px 4px rgba(0,0,0,0.1); }
                50% { text-shadow: 0 0 30px rgba(255, 215, 0, 0.6), 2px 2px 4px rgba(0,0,0,0.1); }
            }

            .header .welcome {
                font-size: 1.4em;
                color: #ff6b35;
                margin-bottom: 15px;
                font-weight: 600;
            }

            .header .sanskrit {
                font-size: 1.3em;
                color: #666;
                font-style: italic;
                margin-bottom: 20px;
            }

            .header .date-time {
                font-size: 1.15em;
                color: #777;
                margin-top: 10px;
            }

            .content-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
            }

            .card {
                background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%);
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 12px 45px rgba(0,0,0,0.15);
                border: 2px solid #ffd700;
                position: relative;
                transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                transform-style: preserve-3d;
            }

            .card:hover {
                transform: translateY(-10px) rotateX(5deg) rotateY(5deg);
                box-shadow: 0 25px 60px rgba(0,0,0,0.3);
            }

            .card h2 {
                color: #d84315;
                margin-bottom: 25px;
                font-size: 1.9em;
                font-family: 'Playfair Display', serif;
            }

            .card p {
                color: #555;
                line-height: 1.9;
                font-size: 1.08em;
            }

            .map-container {
                height: 450px;
                border-radius: 15px;
                overflow: hidden;
                margin-top: 25px;
                border: 3px solid #ff6b35;
                transition: all 0.3s;
            }

            .map-container:hover {
                transform: scale(1.02);
                box-shadow: 0 15px 40px rgba(255, 107, 53, 0.3);
            }

            .schedule-item {
                padding: 20px;
                margin: 18px 0;
                background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
                border-left: 5px solid #ff6b35;
                border-radius: 10px;
                transition: all 0.3s;
                transform-style: preserve-3d;
            }

            .schedule-item:hover {
                box-shadow: -5px 5px 15px rgba(255, 107, 53, 0.2);
            }

            .schedule-item .time {
                font-weight: 700;
                color: #d84315;
                margin-bottom: 8px;
                font-size: 1.1em;
            }

            .full-width-card {
                grid-column: 1 / -1;
            }

            .logout-btn {
                position: fixed;
                bottom: 25px;
                right: 25px;
                background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%);
                color: #d84315;
                border: 3px solid #ff6b35;
                padding: 12px 30px;
                border-radius: 50px;
                cursor: pointer;
                font-weight: 700;
                transition: all 0.3s;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                z-index: 100;
            }

            .logout-btn:hover {
                background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
                color: white;
                transform: translateY(-2px) scale(1.05);
            }

            .diya-decoration {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin: 25px 0;
                font-size: 35px;
            }

            .diya-decoration span {
                display: inline-block;
                animation: flicker 2s ease-in-out infinite;
            }

            .diya-decoration span:nth-child(2) { animation-delay: 0.2s; }
            .diya-decoration span:nth-child(3) { animation-delay: 0.4s; }
            .diya-decoration span:nth-child(4) { animation-delay: 0.6s; }
            .diya-decoration span:nth-child(5) { animation-delay: 0.8s; }

            @keyframes flicker {
                0%, 100% { 
                    transform: scale(1) translateY(0);
                    filter: brightness(1);
                }
                50% { 
                    transform: scale(1.1) translateY(-3px);
                    filter: brightness(1.3);
                }
            }

            .blessing-box {
                background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
                padding: 25px;
                border-radius: 15px;
                margin-top: 25px;
                border: 2px dashed #ff6b35;
                text-align: center;
                animation: borderGlow 3s ease-in-out infinite;
            }

            @keyframes borderGlow {
                0%, 100% { 
                    border-color: #ff6b35;
                    box-shadow: 0 0 10px rgba(255, 107, 53, 0.2);
                }
                50% { 
                    border-color: #f7931e;
                    box-shadow: 0 0 20px rgba(247, 147, 30, 0.4);
                }
            }

            .blessing-box p {
                color: #d84315;
                font-size: 1.15em;
                font-style: italic;
                font-weight: 500;
            }

            .direction-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                border-radius: 10px;
                text-decoration: none;
                font-weight: 600;
                font-size: 1.05em;
                transition: all 0.3s;
                border: 2px solid;
            }

            .google-btn {
                background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
                color: white;
                border-color: #4285f4;
            }

            .google-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(66, 133, 244, 0.3);
            }

            .apple-btn {
                background: linear-gradient(135deg, #000000 0%, #333333 100%);
                color: white;
                border-color: #000000;
            }

            .apple-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
            }

            .decorative-line {
                width: 150px;
                height: 3px;
                background: linear-gradient(90deg, transparent, #ff6b35, transparent);
                margin: 20px auto;
            }

          .deity-corner {
                position: absolute;
                top: 0px;
                text-align: center;
                z-index: 99;
                background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%);
                border-radius: 12px;
                padding: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                border: 3px solid #ff6b35;
                transition: all 0.3s;
            }

            .deity-corner:hover {
                transform: translateY(-5px) scale(1.05);
                box-shadow: 0 15px 40px rgba(0,0,0,0.3);
            }

            .deity-left {
                left: 5px;
            }

            .deity-right {
                right: 5px;
            }

            .deity-image-small {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                object-fit: cover;
                border: 3px solid #ff6b35;
                box-shadow: 0 5px 15px rgba(255, 107, 53, 0.3);
                transition: transform 0.3s;
            }

            .deity-image-small:hover {
                transform: rotate(5deg) scale(1.1);
            }

            .deity-label {
                font-size: 0.75em;
                color: #d84315;
                font-weight: 600;
                margin-top: 5px;
                font-family: 'Playfair Display', serif;
            }

            @media (max-width: 768px) {
                .content-grid {
                    grid-template-columns: 1fr;
                }
                .header h1 {
                    font-size: 2.2em;
                }
                .card:hover {
                    transform: translateY(-5px);
                }
                .deity-corner {
                    top: 80px;
                    padding: 10px;
                    img {
                        width: 40px;
                        height: 40px;
                    }
                }
                .deity-left {
                    left: 10px;
                }
                .deity-right {
                    right: 10px;
                }
                .deity-image-small {
                    width: 40px;
                    height: 40px;
                }
                .deity-label {
                    font-size: 0.65em;
                }
            }
        </style>

        <button class="logout-btn" onclick="logout()">← Logout</button>


         <!-- Deity Images -->
            <div class="deity-corner deity-left">
                <img src="https://png.pngtree.com/png-vector/20250121/ourmid/pngtree-ganesha-the-embodiment-of-prosperity-and-joy-png-image_15287837.png" 
                     alt="Lord Ganesha" 
                     class="deity-image-small"
                     onerror="this.style.display='none'">
                <p class="deity-label">॥ श्री गणेशाय नमः ॥</p>
               <!-- <p class="deity-label">Lord Ganesha</p> -->
            </div>
            <div class="deity-corner deity-right">
                <img src="https://www.vhv.rs/dpng/d/22-227481_laxmi-narasimha-swamy-png-transparent-png.png" 
                     alt="Narsimha Lakshmi" 
                     class="deity-image-small"
                     onerror="this.style.display='none'">
                <p class="deity-label">॥ श्री लक्ष्मी नरसिंह प्रसन्न ॥ </p>
                <!-- <p class="deity-label">Lord Narsimha</p> -->
            </div>


        <div class="header">
            <h1>🪔 गृह प्रवेश समारोह 🪔</h1>
            <p class="sanskrit">Griha Pravesh Ceremony / House warming ceremony</p>
            <div class="decorative-line"></div>
            <p class="welcome">Namaste, <span id="guestName">Guest</span>!</p>
            <p class="date-time">Join us in celebrating this auspicious occasion</p>
            <p class="date-time"><strong>Sunday, December 14th, 2025</strong></p>
            <div class="diya-decoration">
                <span>🪔</span>
                <span>🪔</span>
                <span>🪔</span>
                <span>🪔</span>
                <span>🪔</span>
            </div>
        </div>

        <div class="content-grid">
            <div class="card">
                <h2>📍 Venue Details</h2>
                <p><strong>Address:</strong><br>
                398 Bluefield Drive<br>
                San Jose, CA 95136</p>
                <p style="margin-top: 20px;"><strong>🚗 Parking:</strong> Available on premises</p>
                <div class="blessing-box">
                    <p>🕉️ May Lord Ganesha bless this home 🕉️</p>
                </div>
            </div>

            <div class="card">
                <h2>⏰ Program Schedule</h2>
                ${roleMessage}
                ${scheduleHTML}
            </div>

            <div class="card full-width-card">
                <h2>🗺️ Location & Directions</h2>
                <p style="margin-bottom: 20px;">Find your way to our new abode:</p>
                
                <div style="display: flex; gap: 15px; margin-bottom: 25px; flex-wrap: wrap;">
                    <a href="https://maps.google.com/?q=398+Bluefield+Drive,+San+Jose,+CA+95136" 
                       target="_blank" 
                       class="direction-btn google-btn">
                        🗺️ Open in Google Maps
                    </a>
                    <a href="https://maps.apple.com/?address=398+Bluefield+Drive,+San+Jose,+CA+95136" 
                       target="_blank" 
                       class="direction-btn apple-btn">
                        🍎 Open in Apple Maps
                    </a>
                </div>

                <div class="map-container">
                    <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3175.0353355620023!2d-121.85125252370437!3d37.27058917211692!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808e3236c44e969f%3A0x9b68f34fb35b6afb!2s398%20Bluefield%20Dr%2C%20San%20Jose%2C%20CA%2095136!5e0!3m2!1sen!2sus!4v1765432006867!5m2!1sen!2sus" 
                        width="100%" 
                        height="100%" 
                        style="border:0;" 
                        allowfullscreen="" 
                        loading="lazy" 
                        referrerpolicy="no-referrer-when-downgrade">
                    </iframe>
                </div>
                
                <p style="margin-top: 20px; font-size: 0.95em; color: #777;">
                    <strong>Note:</strong> Click on any button above to open the location in your preferred maps application
                </p>
            </div>

            <div class="card full-width-card">
                <h2>💝 Message from the Hosts</h2>
                <p>With hearts full of gratitude and joy, we invite you to bless our new home with your presence. As we embark on this new chapter of our lives, your blessings and good wishes mean the world to us. This house becomes a home only when filled with the warmth of loved ones like you. Join us for this sacred ceremony as we seek the blessings of Lord Ganesha and perform the traditional rituals that will sanctify our new dwelling.</p>
                <div class="diya-decoration" style="margin-top: 30px;">
                    <span>🪷</span>
                    <span>🕉️</span>
                    <span>🪷</span>
                </div>
                <p style="margin-top: 25px; text-align: right; font-style: italic; color: #d84315; font-size: 1.2em; font-weight: 600;">
                    - Chaithra &amp; Vedant
                </p>
                <p style="margin-top: 25px; text-align: center; font-style: italic; color: #d84315; font-size: 1.2em; font-weight: 600;">
                    सर्वे भवन्तु सुखिनः<br>
                    <span style="font-size: 0.9em; color: #666;">May all be happy and prosperous</span>
                </p>
            </div>
        </div>
    `;

    res.json({ html: detailsHTML });
});

// Endpoint to logout (invalidate token)
app.post('/api/logout', (req, res) => {
    const token = req.headers.authorization;
    
    if (token && activeSessions.has(token)) {
        const session = activeSessions.get(token);
        console.log(`🔒 Session ended: ${session.guestName} (${session.role})`);
        activeSessions.delete(token);
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
});

// Cleanup expired sessions every hour
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [token, session] of activeSessions.entries()) {
        if (now > session.expiresAt) {
            activeSessions.delete(token);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned ${cleanedCount} expired session(s)`);
    }
}, 60 * 60 * 1000);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'Server is running', 
        timestamp: new Date().toISOString(),
        activeSessions: activeSessions.size
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
Press Ctrl+C to stop the server
    `);
});
