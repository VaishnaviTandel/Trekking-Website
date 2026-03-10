import { Link } from "react-router-dom";

export default function AdminSidebar() {

  return (
    <div style={{
      width: "220px",
      background: "#111",
      color: "white",
      height: "100vh",
      padding: "20px"
    }}>

      <h2>Trek Admin</h2>

      <ul style={{ listStyle: "none", padding: 0 }}>

        <li>
          <Link to="/admin/trips">Manage Treks</Link>
        </li>

        <li>
          <Link to="/admin/add-trip">Add Trip</Link>
        </li>

      </ul>

    </div>
  );
}