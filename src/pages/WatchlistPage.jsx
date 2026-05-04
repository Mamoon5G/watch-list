import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { 
  collection, query, where, getDocs, onSnapshot, 
  addDoc, deleteDoc, doc, updateDoc 
} from "firebase/firestore";
import { 
  Film, Tv, Gamepad2, Plus, Trash2, CheckCircle2, 
  Circle, Moon, Sun, LayoutGrid, LogOut,
  Share2, ChevronRight, X, Check
} from "lucide-react";

export default function WatchlistPage({ currentUser }) {
  const { usernameList } = useParams();
  const navigate = useNavigate();
  const username = usernameList.replace("-list", "");
  
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  const [ownerId, setOwnerId] = useState(null);
  const [loadingOwner, setLoadingOwner] = useState(true);
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [pendingItem, setPendingItem] = useState(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    const fetchOwner = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username.toLowerCase()));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          setOwnerId(snapshot.docs[0].id);
        } else {
          setOwnerId(null);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setLoadingOwner(false);
      }
    };
    fetchOwner();
  }, [username]);

  useEffect(() => {
    if (!ownerId) return;
    const itemsRef = collection(db, "users", ownerId, "watchlist");
    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      fetchedItems.sort((a, b) => b.createdAt - a.createdAt);
      setItems(fetchedItems);
    });
    return () => unsubscribe();
  }, [ownerId]);

  const isOwner = currentUser && ownerId === currentUser.uid;

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  const handleAdd = useCallback(() => {
    if (!input.trim() || !isOwner) return;
    setPendingItem(input);
    setInput("");
  }, [input, isOwner]);

  const selectCategory = async (type) => {
    if (!isOwner) return;
    const itemsRef = collection(db, "users", ownerId, "watchlist");
    await addDoc(itemsRef, {
      name: pendingItem,
      type,
      watched: false,
      createdAt: Date.now()
    });
    setPendingItem(null);
  };

  const toggleWatched = async (id, currentStatus) => {
    if (!isOwner) return;
    const itemRef = doc(db, "users", ownerId, "watchlist", id);
    await updateDoc(itemRef, { watched: !currentStatus });
  };

  const deleteItem = async (id) => {
    if (!isOwner) return;
    const itemRef = doc(db, "users", ownerId, "watchlist", id);
    await deleteDoc(itemRef);
  };

  if (loadingOwner) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!ownerId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-xl font-bold mb-4">User Not Found</h1>
        <button onClick={() => navigate("/")} className="text-brand-primary font-bold">Go Home</button>
      </div>
    );
  }

  const renderSection = (type, title, icon) => {
    const filtered = items.filter((i) => i.type === type);
    const watched = filtered.filter((i) => i.watched);
    const need = filtered.filter((i) => !i.watched);

    if (filtered.length === 0) return null;

    return (
      <div className="space-y-4 animate-fade-in p-4 sm:p-6 bg-card border border-border/50 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <span className="text-brand-primary">{icon}</span>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <span className="ml-auto text-[10px] font-bold opacity-40">[{filtered.length}]</span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-10">
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Pending</h3>
            <div className="space-y-1">
              {need.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic opacity-40 px-1">Empty</p>
              ) : (
                need.map((item) => (
                  <ItemRow key={item.id} item={item} isOwner={isOwner} onToggle={() => toggleWatched(item.id, item.watched)} onDelete={() => deleteItem(item.id)} />
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Finished</h3>
            <div className="space-y-1">
              {watched.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic opacity-40 px-1">Empty</p>
              ) : (
                watched.map((item) => (
                  <ItemRow key={item.id} item={item} isOwner={isOwner} onToggle={() => toggleWatched(item.id, item.watched)} onDelete={() => deleteItem(item.id)} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 pb-20 selection:bg-brand-primary/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10">
        
        <nav className="flex items-center justify-between border-b border-border/40 pb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white">
              <Tv className="w-4 h-4" />
            </div>
            <span className="text-lg font-black tracking-tighter uppercase">Watchly</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={handleShare} className="p-2 hover:bg-secondary rounded-lg transition-all" title="Share link">
              <Share2 className="w-4 h-4 text-brand-primary" />
            </button>
            <button onClick={() => setIsDark(!isDark)} className="p-2 hover:bg-secondary rounded-lg transition-all">
              {isDark ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-brand-primary" />}
            </button>
            {currentUser && (
              <button onClick={handleLogout} className="p-2 hover:bg-destructive/5 text-destructive rounded-lg transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </nav>

        <header className="flex items-center gap-2 animate-slide-down">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight whitespace-nowrap">
            <span className="uppercase">{username}'s</span>
            <span className="text-brand-primary ml-1 italic uppercase">Watchlist</span>
          </h1>
          <div className="h-px flex-1 bg-border/40"></div>
          <div className="h-2 w-2 rounded-full bg-brand-secondary/40"></div>
        </header>

        {isOwner && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 group">
              <div className="flex-1 relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Add movie, series..."
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="w-full bg-secondary/40 border-2 border-border/40 focus:border-brand-primary p-3 rounded-xl text-sm outline-none transition-all placeholder:text-muted-foreground/30 font-medium"
                />
              </div>
              <button 
                onClick={handleAdd}
                disabled={!input.trim()}
                className="p-3.5 bg-brand-primary text-white rounded-xl shadow-lg shadow-brand-primary/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center shrink-0"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Centered Larger Category Selection */}
            {pendingItem && (
              <div className="animate-scale-in flex flex-col items-center justify-center space-y-6 p-8 bg-card border-2 border-brand-primary/20 rounded-2xl shadow-2xl">
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">Adding to list</p>
                  <h3 className="text-xl font-bold italic">"{pendingItem}"</h3>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                  <button onClick={() => selectCategory("movie")} className="flex flex-col items-center gap-2 px-8 py-5 rounded-xl bg-secondary hover:bg-brand-primary hover:text-white border border-border/50 transition-all shadow-md active:scale-95 min-w-[100px]">
                    <Film className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Movie</span>
                  </button>
                  <button onClick={() => selectCategory("series")} className="flex flex-col items-center gap-2 px-8 py-5 rounded-xl bg-secondary hover:bg-brand-primary hover:text-white border border-border/50 transition-all shadow-md active:scale-95 min-w-[100px]">
                    <Tv className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Series</span>
                  </button>
                  <button onClick={() => selectCategory("anime")} className="flex flex-col items-center gap-2 px-8 py-5 rounded-xl bg-secondary hover:bg-brand-primary hover:text-white border border-border/50 transition-all shadow-md active:scale-95 min-w-[100px]">
                    <Gamepad2 className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Anime</span>
                  </button>
                </div>

                <button onClick={() => setPendingItem(null)} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors">
                  Cancel Addition
                </button>
              </div>
            )}
          </div>
        )}

        <main className="space-y-8">
          {items.length === 0 ? (
            <div className="py-12 border border-dashed border-border/40 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30 italic">No entries yet</p>
            </div>
          ) : (
            <>
              {renderSection("movie", "Movies", <Film className="w-4 h-4" />)}
              {renderSection("series", "Series", <Tv className="w-4 h-4" />)}
              {renderSection("anime", "Anime", <Gamepad2 className="w-4 h-4" />)}
            </>
          )}
        </main>

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
            <div className="bg-foreground text-background px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-white/10">
              <Check className="w-3.5 h-3.5 text-brand-primary" />
              Link copied to clipboard
            </div>
          </div>
        )}
        
        <footer className="pt-10 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] text-center border-t border-border/40">
          Watchly • Share your taste
        </footer>
      </div>
    </div>
  );
}

function ItemRow({ item, isOwner, onToggle, onDelete }) {
  return (
    <div className={`group flex items-center gap-2.5 py-1.5 min-w-0 transition-opacity ${item.watched ? 'opacity-40' : ''}`}>
      <button 
        onClick={onToggle}
        disabled={!isOwner}
        className={`shrink-0 transition-transform ${isOwner ? "active:scale-90" : "cursor-default"}`}
      >
        {item.watched ? (
          <div className="w-4 h-4 bg-brand-primary rounded-[4px] flex items-center justify-center text-white">
            <Check className="w-3 h-3" />
          </div>
        ) : (
          <div className="w-4 h-4 border border-border/80 rounded-[4px] group-hover:border-brand-primary transition-colors"></div>
        )}
      </button>

      <span className={`flex-1 text-[11px] sm:text-xs font-bold truncate ${item.watched ? "line-through" : "text-foreground"}`}>
        {item.name}
      </span>

      {isOwner && (
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
