import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { 
  collection, query, where, getDocs, onSnapshot, 
  addDoc, deleteDoc, doc, updateDoc 
} from "firebase/firestore";
import { 
  Film, Tv, Gamepad2, Trash2, CheckCircle2, 
  Circle, Moon, Sun, LayoutGrid, LogOut,
  Share2, ChevronRight, Check, Send, BookOpen, X
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
  const [activeTab, setActiveTab] = useState("all");
  
  // Input options state
  const [inputStatus, setInputStatus] = useState("pending");
  const [inputCategory, setInputCategory] = useState("movie");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [forceHideOptions, setForceHideOptions] = useState(false);

  // Toasts
  const [toast, setToast] = useState(null); // { message: "", icon: <Icon /> }

  const inputRef = useRef(null);

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

  const showToast = (message, duration = 3000) => {
    setToast({ message });
    setTimeout(() => setToast(null), duration);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Link copied to clipboard");
  };

  const handleAdd = useCallback(async () => {
    if (!input.trim() || !isOwner) return;
    
    const categoryToSave = activeTab === "all" ? inputCategory : activeTab;
    const isWatched = inputStatus === "finished";
    const nameToAdd = input.trim();

    const itemsRef = collection(db, "users", ownerId, "watchlist");
    await addDoc(itemsRef, {
      name: nameToAdd,
      type: categoryToSave,
      watched: isWatched,
      createdAt: Date.now()
    });

    // Reset input but keep focus and options active
    setInput("");
    inputRef.current?.focus();
    
    // Show 0.5s toast as requested
    setToast({ message: `'${nameToAdd}' added in ${categoryToSave}` });
    setTimeout(() => setToast(null), 1000);

  }, [input, isOwner, activeTab, inputCategory, inputStatus, ownerId]);

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

  const showOptions = !forceHideOptions && (isInputFocused || input.trim().length > 0);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 pb-6 selection:bg-brand-primary/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 flex flex-col">
        
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
          <div className="space-y-4">
            {/* Input Wrapper */}
            <div className="relative group">
              <input
                ref={inputRef}
                value={input}
                onFocus={() => {
                  setIsInputFocused(true);
                  setForceHideOptions(false);
                }}
                onBlur={(e) => {
                  // Delay blur to allow clicks on options/tabs to process
                  setTimeout(() => {
                    if (!document.activeElement.closest('.add-options-area')) {
                      setIsInputFocused(false);
                    }
                  }, 400);
                }}
                onChange={(e) => {
                  setInput(e.target.value);
                  setForceHideOptions(false);
                }}
                placeholder="What's next on your list?"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") {
                    setForceHideOptions(true);
                    inputRef.current?.blur();
                  }
                }}
                className="w-full bg-secondary/40 border-2 border-border/40 focus:border-brand-primary py-3.5 pl-4 pr-12 rounded-xl text-sm outline-none transition-all placeholder:text-muted-foreground/30 font-medium"
              />
              <button 
                onClick={handleAdd}
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-brand-primary disabled:opacity-30 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Contextual Options (Shows when typing or focused) */}
            {showOptions && (
              <div className="relative add-options-area flex flex-col gap-3 p-3 pr-8 bg-secondary/20 rounded-xl border border-border/30 animate-fade-in">
                <button 
                  onClick={() => setForceHideOptions(true)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors p-1"
                  title="Close options (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
                {/* Category Selection (Only if All tab is active) */}
                {activeTab === "all" && (
                  <>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest w-16">Type:</span>
                      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input 
                          type="radio" 
                          name="category" 
                          value="movie" 
                          checked={inputCategory === "movie"} 
                          onChange={() => setInputCategory("movie")}
                          className="accent-brand-primary"
                        />
                        Movies
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input 
                          type="radio" 
                          name="category" 
                          value="series" 
                          checked={inputCategory === "series"} 
                          onChange={() => setInputCategory("series")}
                          className="accent-brand-primary"
                        />
                        Series / TV Shows
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input 
                          type="radio" 
                          name="category" 
                          value="anime" 
                          checked={inputCategory === "anime"} 
                          onChange={() => setInputCategory("anime")}
                          className="accent-brand-primary"
                        />
                        Anime
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input 
                          type="radio" 
                          name="category" 
                          value="comics" 
                          checked={inputCategory === "comics"} 
                          onChange={() => setInputCategory("comics")}
                          className="accent-brand-primary"
                        />
                        Books / Comics
                      </label>
                    </div>
                    <div className="h-px w-full bg-border/40"></div>
                  </>
                )}

                {/* Status Selection */}
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest w-16">Status:</span>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input 
                      type="radio" 
                      name="status" 
                      value="pending" 
                      checked={inputStatus === "pending"} 
                      onChange={() => setInputStatus("pending")}
                      className="accent-brand-primary"
                    />
                    Pending
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input 
                      type="radio" 
                      name="status" 
                      value="finished" 
                      checked={inputStatus === "finished"} 
                      onChange={() => setInputStatus("finished")}
                      className="accent-brand-primary"
                    />
                    Finished
                  </label>
                </div>
              </div>
            )}
            
          </div>
        )}

        {/* Tab Bar (Visible to everyone) */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-border/40">
          {['all', 'movie', 'series', 'anime', 'books'].map((tab) => (
            <button
              key={tab}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevents input from losing focus
                setActiveTab(tab);
              }}
              onClick={() => setActiveTab(tab)} // Fallback for touch devices
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap capitalize ${activeTab === tab ? 'bg-brand-primary text-white shadow-md' : 'text-muted-foreground hover:bg-secondary/50'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List Content */}
        <main className="space-y-6 pt-4">
          {items.length === 0 ? (
            <div className="py-12 border border-dashed border-border/40 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30 italic">No entries yet</p>
            </div>
          ) : (
            <>
              {(activeTab === "all" || activeTab === "movie") && renderSection("movie", "Movies", <Film className="w-4 h-4" />)}
              {(activeTab === "all" || activeTab === "series") && renderSection("series", "Series / TV Shows", <Tv className="w-4 h-4" />)}
              {(activeTab === "all" || activeTab === "anime") && renderSection("anime", "Anime", <Gamepad2 className="w-4 h-4" />)}
              {(activeTab === "all" || activeTab === "books") && renderSection("comics", "Books / Comics", <BookOpen className="w-4 h-4" />)}
            </>
          )}
        </main>

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
            <div className="bg-foreground text-background px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-white/10">
              <Check className="w-3.5 h-3.5 text-brand-primary" />
              {toast.message}
            </div>
          </div>
        )}
        
        <footer className="mt-auto flex flex-col gap-2 pt-6 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] text-center border-t border-border/40">
          <div>Watchly • Share your taste</div>
          <div>
            Created by{" "}
            <a 
              href="https://github.com/Mamoon-5G" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-brand-primary transition-colors"
            >
              Mamoon Siddiqui
            </a>.
          </div>
          <div>2026 &copy; All Rights Reserved</div>
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

      <span className={`flex-1 text-[11px] sm:text-xs font-bold break-words leading-snug py-0.5 ${item.watched ? "line-through" : "text-foreground"}`}>
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
