# Backend Deployment to Render - TODO Steps

## Plan Breakdown (Approved: GitHub https://github.com/LALINIGEDDAM1/SHEHACK, Frontend: https://question-paper-generator-bm7p.onrender.com/)

**✅ Completed:**
- [x] Analyzed files (app.py Flask, deps, Procfile, render.yaml)
- [x] Local test: Deps installed OK, app.py running on http://localhost:5000 (debug mode, active terminal)
- [x] Created runtime.txt (python-3.12.4)
- [x] Updated render.yaml (name: question-generator-backend, env GROQ_API_KEY/SECRET_KEY, 1GB uploads disk)
- [x] Created requirements.txt.pinned (pinned stable versions)

**⏳ Pending:**
2. **Recommend**: mv requirements.txt.pinned requirements.txt (pin deps for Render).
3. **Git Commit/Push**: git add . && git commit -m "Add runtime.txt, pinned reqs, render.yaml for backend deploy" && git push origin main.
4. **Manual Deploy Steps** (do on render.com/dashboard):
   - New → Web Service → Connect GitHub repo SHEHACK → Branch: main.
   - Root Directory: / (CWD).
   - Runtime: Python 3.
   - Build: pip install -r requirements.txt
   - Start: gunicorn app:app --workers 1 --bind 0.0.0.0:$PORT --timeout 120 (or auto from render.yaml/Procfile).
   - Plan: Free (add disk needs Starter $7/mo).
   - Env Vars: Add GROQ_API_KEY (your key), SECRET_KEY (auto-generate).
   - Disks: uploads (1GB, /app/uploads).
   - Deploy → Wait logs → Get URL e.g. https://question-generator-backend-abc.onrender.com
5. **Test**: Visit backend URL (shows login.html), test /question_bank, POST /generate (needs API key).
6. **Frontend Update**: If needed, update React to call backend APIs.
7. **Cleanup**: Stop local server (Ctrl+C), monitor Render logs.

**Next**: Run git status && git push (after mv reqs).


