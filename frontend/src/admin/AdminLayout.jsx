import { Link } from "react-router-dom";

export default function AdminLayout({children}){

  return(

    <div className="flex min-h-screen">

      {/* SIDEBAR */}

      <div className="w-64 bg-gray-900 text-white p-6">

        <h1 className="text-xl font-bold mb-8">
          Trek Admin
        </h1>

        <nav className="flex flex-col gap-4">

          <Link to="/admin" className="hover:text-green-400">
            Dashboard
          </Link>

          <Link to="/admin/add-trip" className="hover:text-green-400">
            Add Trip
          </Link>

          <Link to="/admin/trips" className="hover:text-green-400">
            Manage Trips
          </Link>

          <Link to="/admin/messages" className="hover:text-green-400">
            Contact Messages
          </Link>

          <Link to="/admin/bookings" className="hover:text-green-400">
            Bookings
          </Link>

        </nav>

      </div>

      {/* CONTENT */}

      <div className="flex-1 bg-gray-100">

        {children}

      </div>

    </div>

  );

}
