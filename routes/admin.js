const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

// 🔒 SIMPLE PASSWORD PROTECTION FOR SECURITY
const ADMIN_PASSWORD = "1111"; 

const checkAdminAuth = (req, res, next) => {
  const authHeader = req.headers['x-admin-password'] || req.query.pwd;
  if (authHeader !== ADMIN_PASSWORD) {
    return res.status(401).send('<h1>🚫 Unauthorized Access</h1><p>Provide the valid administrative secret passkey.</p>');
  }
  next();
};

// 🖥️ 1. SERVE VISUAL PANEL HTML
router.get('/dashboard', checkAdminAuth, async (req, res) => {
  try {
    // Pull the latest pending posts to show in the review queue
    const pendingVents = await prisma.vent.findMany({
      where: { status: 'pending', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { username: true, area: true } } }
    });

    // Pure, scannable HTML/JS document sent straight to the browser
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tona Content Moderation</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-900 text-slate-100 font-sans min-h-screen p-6">
      <div class="max-w-4xl mx-auto">
        <header class="flex justify-between items-center border-b border-slate-700 pb-4 mb-6">
          <div>
            <h1 class="text-2xl font-bold text-indigo-400">🛡️ Tona Live Moderation Desk</h1>
            <p class="text-sm text-slate-400">Review, approve, or discard pending serverless timeline posts.</p>
          </div>
          <span class="bg-indigo-900 text-indigo-200 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-700">Vercel Edge Ready</span>
        </header>

        <main>
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>⏳ Pending Queue</span>
            <span class="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">${pendingVents.length} entries</span>
          </h2>

          ${pendingVents.length === 0 ? `
            <div class="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400">
              🎉 Hooray! The pending moderation backlog is completely empty.
            </div>
          ` : `
            <div class="space-y-4">
              ${pendingVents.map(vent => `
                <div id="vent-${vent.id}" class="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm transition-all hover:border-slate-600">
                  <div class="flex justify-between items-start gap-4 mb-3">
                    <p class="text-slate-200 text-base leading-relaxed flex-1 whitespace-pre-wrap">${vent.content}</p>
                  </div>
                  <div class="flex justify-between items-center pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                    <div>
                      Broadcasted by <span class="text-indigo-300 font-medium">@${vent.author?.username || 'anonymous'}</span> 
                      in <span class="text-slate-300">${vent.author?.area || 'Unknown'}</span>
                    </div>
                    <div class="flex gap-2">
                      <button onclick="moderate('${vent.id}', 'rejected')" class="bg-red-900/40 hover:bg-red-900 text-red-300 border border-red-700/50 px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Reject / Drop
                      </button>
                      <button onclick="moderate('${vent.id}', 'approved')" class="bg-emerald-900/40 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Approve Post 👍
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </main>
      </div>

      <script>
        async function moderate(id, action) {
          const pwd = new URLSearchParams(window.location.search).get('pwd');
          try {
            const res = await fetch('/api/admin/action/' + id, {
              method: 'PATCH',
              headers: { 
                'Content-Type': 'application/json',
                'x-admin-password': pwd
              },
              body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (data.success) {
              const el = document.getElementById('vent-' + id);
              el.style.opacity = '0';
              setTimeout(() => el.remove(), 300);
            } else {
              alert('Error: ' + data.message);
            }
          } catch (err) {
            alert('Failed to execute moderation transaction.');
          }
        }
      </script>
    </body>
    </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).send('Database connection pipeline broke down.');
  }
});

// ⚙️ 2. BACKEND MODERATION ACTION DISPATCHER
router.patch('/action/:id', checkAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "approved" or "rejected"

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid status action" });
    }

    await prisma.vent.update({
      where: { id },
      data: { status: action }
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;