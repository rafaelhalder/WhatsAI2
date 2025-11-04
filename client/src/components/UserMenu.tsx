// src/Components/Layout/UserMenu.jsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, UserRound, LogIn, UserPlus, LogOut, Settings, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { userAuthStore } from '../features/auth/store/authStore';

function UserMenu() {
    const user = userAuthStore((state) => state.user);
    const token = userAuthStore((state) => state.token);
    const logout = userAuthStore((state) => state.logout);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    // Close menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setIsMenuOpen(false);
          }
      };

      if (isMenuOpen) {
          document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [isMenuOpen]);
    
    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };
    
    const handleLogout = async () => {
        logout();
        toast.success("Logout realizado com sucesso!");
        setIsMenuOpen(false);
    };
    
    return (
      <div className="relative" ref={menuRef}>
          <button 
              className="flex flex-row items-center justify-center p-4 shadow-lg rounded-full border transition-colors duration-300 bg-base-200/60 border-base-300 hover:border-primary"
              onClick={toggleMenu}
              aria-label="User menu"
              aria-expanded={isMenuOpen}
          >
              <div>
                  <Menu className="text-base-content mr-1.5" />
              </div>
              <div>
                  <UserRound className="text-base-content" />
              </div>
          </button>

          {isMenuOpen && (
              <div 
                  className="menu absolute right-0 mt-2 w-48 rounded-box shadow-lg z-50 bg-base-100 border border-base-300"
              >
                  {!token ? (
                      <>
                          <Link
                              to="/login"
                              className="flex items-center w-full px-4 py-2 text-sm text-base-content hover:bg-base-200"
                              onClick={() => setIsMenuOpen(false)}
                          >
                              <LogIn className="mr-2 h-4 w-4" />
                              Login
                          </Link>
                          <Link 
                              to="/register"
                              className="flex items-center w-full px-4 py-2 text-sm text-base-content hover:bg-base-200"
                              onClick={() => setIsMenuOpen(false)}
                          >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Sign Up
                          </Link>
                      </>
                  ) : (
                      <>
                          <div className="px-4 py-2 text-sm font-medium text-base-content border-b border-base-300">
                              {user?.name || "User"}
                          </div>
                          <Link 
                              to="/profile"
                              className="flex items-center w-full px-4 py-2 text-sm text-base-content hover:bg-base-200"
                              onClick={() => setIsMenuOpen(false)}
                          >
                              <UserRound className="mr-2 h-4 w-4" />
                              Profile
                          </Link>
                          <Link 
                              to="/settings"
                              className="flex items-center w-full px-4 py-2 text-sm text-base-content hover:bg-base-200"
                              onClick={() => setIsMenuOpen(false)}
                          >
                              <Settings className="mr-2 h-4 w-4" />
                              Settings
                          </Link>
                          <Link 
                              to="/subscription"
                              className="flex items-center w-full px-4 py-2 text-sm text-base-content hover:bg-base-200"
                              onClick={() => setIsMenuOpen(false)}
                          >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Assinatura
                          </Link>
                          <div className="my-1 border-t border-base-300"></div>
                          <button 
                              className="flex items-center w-full px-4 py-2 text-sm text-left text-base-content hover:bg-base-200"
                              onClick={handleLogout}
                          >
                              <LogOut className="mr-2 h-4 w-4" />
                              Logout
                          </button>
                      </>
                  )}
              </div>
          )}
      </div>
  );
}

export default UserMenu;