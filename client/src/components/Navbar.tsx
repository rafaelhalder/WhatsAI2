import { Link, useLocation } from "react-router-dom";
import "./NavBar.css"
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import UserMenu from "./UserMenu";
import { userAuthStore } from "../features/auth/store/authStore";

function Navbar() {
  const location = useLocation();
  const { token } = userAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  
  // Dynamic nav items based on authentication
  const isAuthenticated = !!token;
  const navItems = isAuthenticated 
    ? [
        { name: "Dashboard", path: "/dashboard", dataTour: "dashboard" },
        { name: "Instâncias", path: "/instances", dataTour: "create-instance" },
        { name: "Templates", path: "/templates", dataTour: "templates" },
        { name: "Campanhas", path: "/campaigns", dataTour: "campaigns" },
        { name: "Automações", path: "/automations", dataTour: "automations" },
        { name: "Assinatura", path: "/subscription", dataTour: "subscription" },
      ]
    : [
        { name: "Home", path: "/" },
        { name: "Planos", path: "/pricing" },
        { name: "Login", path: "/login" },
        { name: "Registrar", path: "/register" },
      ];

  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setActiveItem(null);
      return;
    }
    const route = path.substring(1);
    const item = navItems.find(item =>
      item.path.substring(1).toLowerCase() === route.toLowerCase()
    );
    if (item) setActiveItem(item.name);
  }, [location, navItems]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // 768px is Tailwind's md breakpoint
        setMobileMenuOpen(false);
      }
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Call once to check initial size
    handleResize();

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="hidden md:flex justify-center items-center bg-transparent p-4 w-full">
        <div className="nav-container flex flex-row items-center rounded-full p-2 shadow-lg mx-auto border relative overflow-hidden bg-base-200/60 border-base-300">
          <div className="nav-glow-1"></div>
          <div className="nav-glow-2"></div>
          <div className="flex flex-row space-x-1 z-10">

            {navItems.map((item) => (
              <Link
                className={`px-4 py-2 rounded-full cursor-pointer transition-all duration-200 ${activeItem === item.name
                  ? ('bg-primary text-primary-content font-bold shadow-lg')
                  : ('text-base-content font-semibold hover:bg-base-300 hover:text-base-content')
                  }`} to={item.path}
                key={item.name}
                onClick={() => setActiveItem(item.name)}
                data-tour={item.dataTour || undefined}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {/* Mobile Navigation Header - Changed to justify-end to position menu at end */}
      <div className="md:hidden flex justify-end items-center p-3 w-full">
        {/* Hamburger Menu Button - moved to end */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="btn btn-ghost btn-circle"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {mobileMenuOpen && (
        <div className="absolute top-16 left-4 right-4 p-3 rounded-xl shadow-lg z-50 bg-base-100 border border-base-300 backdrop-blur-md">
          {/* Navigation links */}
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <Link
                to={item.path}
                key={item.name}
                className={`px-4 py-3 rounded-lg transition-all ${activeItem === item.name
                  ? ('bg-primary text-primary-content font-bold')
                  : ('text-base-content hover:bg-base-200')
                  }`}
                onClick={() => {
                  setActiveItem(item.name);
                  setMobileMenuOpen(false);
                }}
                data-tour={item.dataTour || undefined}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* User controls section - ThemeToggle and UserMenu side by side */}
          <div className={`mt-4 pt-4 border-t flex items-center justify-between
                        border-base-300`}>
            {/* UserMenu takes up more space */}
            <div className="flex-grow">
              <UserMenu />
            </div>
            {/* ThemeToggle placed to the right */}
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;