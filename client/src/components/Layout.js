import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <>
      <nav className="navbar navbar-expand-md navbar-dark bg-primary shadow-sm">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">
            <i className="bi bi-mortarboard-fill me-2" />
            CampusManagerPro
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className={`collapse navbar-collapse${menuOpen ? ' show' : ''}`}>
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <NavLink className={navClass} to="/" end>
                  <i className="bi bi-speedometer2 me-1" /> Dashboard
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className={navClass} to="/classes">
                  <i className="bi bi-journal-bookmark me-1" /> Classes
                </NavLink>
              </li>
              {user.role === 'student' && (
                <li className="nav-item">
                  <NavLink className={navClass} to="/grades">
                    <i className="bi bi-award me-1" /> My Grades
                  </NavLink>
                </li>
              )}
            </ul>
            <ul className="navbar-nav align-items-md-center">
              <li className="nav-item">
                <NavLink className={navClass} to="/profile">
                  <i className="bi bi-person-circle me-1" />
                  {user.name}
                  <span className="badge bg-light text-primary ms-2 text-capitalize">{user.role}</span>
                </NavLink>
              </li>
              <li className="nav-item ms-md-2">
                <button type="button" className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-1" /> Log out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <main className="container py-4">
        <Outlet />
      </main>
    </>
  );
}
