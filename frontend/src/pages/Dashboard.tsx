import {
  useNavigate
} from "react-router-dom";

import {
  useAuth
} from "../context/AuthContext";

import FileManager from "../components/FileManager";

const Dashboard = () => {
  const navigate =
    useNavigate();

  const {
    user,
    logout
  } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout =
    async () => {
      try {
        await logout();
      } finally {
        navigate("/login", {
          replace: true
        });
      }
    };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-label">
              Authenticated Dashboard
            </p>

            <h1>
              Hello,{" "}
              {user.name}
            </h1>

            <p className="dashboard-email">
              {user.email}
            </p>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={() =>
              void handleLogout()
            }
          >
            Logout
          </button>
        </header>

        <FileManager />
      </div>
    </div>
  );
};

export default Dashboard;