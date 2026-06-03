import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Tv, Sparkles, ChevronRight } from "lucide-react";

export default function AuthPage({ user }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const uName = userDoc.data().username;
          navigate(`/${uName}`);
        }
      }
    };
    checkUser();
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!username.trim()) throw new Error("Username is required");
        if (username.includes(" ")) throw new Error("Username cannot contain spaces");
        
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username.toLowerCase()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          throw new Error("Username already taken");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        await setDoc(doc(db, "users", newUser.uid), {
          username: username.toLowerCase()
        });

        navigate(`/${username.toLowerCase()}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 transition-colors duration-500">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md space-y-8 p-8 glass rounded-3xl border border-border/50 shadow-2xl animate-scale-in">
        
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-primary text-white shadow-lg shadow-brand-primary/20 mx-auto">
            <Tv className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">Watchly</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Personal Collection</p>
          </div>
        </header>

        <main className="space-y-6">
          {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold rounded-xl text-center">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Unique username"
                  className="w-full bg-secondary/50 border-2 border-border/50 focus:border-brand-primary p-3 rounded-xl text-sm outline-none transition-all placeholder:text-muted-foreground/30 font-medium"
                  required={!isLogin}
                />
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-secondary/50 border-2 border-border/50 focus:border-brand-primary p-3 rounded-xl text-sm outline-none transition-all placeholder:text-muted-foreground/30 font-medium"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-secondary/50 border-2 border-border/50 focus:border-brand-primary p-3 rounded-xl text-sm outline-none transition-all placeholder:text-muted-foreground/30 font-medium"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-brand-primary/20 flex justify-center items-center gap-2 mt-4"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (
                <>
                  {isLogin ? "Sign In" : "Get Started"}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="w-full text-center text-xs font-bold text-muted-foreground hover:text-brand-primary transition-colors"
          >
            {isLogin ? "New here? Create account" : "Back to sign in"}
          </button>
        </main>
      </div>

      <footer className="mt-12 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] animate-fade-in">
        Watchly Edition
      </footer>
    </div>
  );
}
