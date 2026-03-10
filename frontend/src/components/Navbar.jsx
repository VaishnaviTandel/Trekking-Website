import { Link } from "react-router-dom";

const Navbar = () => {
  return (

    <div className="bg-black text-white sticky top-0 z-50">

      <div className="max-w-7xl mx-auto flex justify-between items-center p-4">

        <h1 className="text-xl font-bold">
          TrekPlatform
        </h1>

        <div className="flex gap-6">

          <Link to="/">Home</Link>

          <Link to="/trips">
            Treks
          </Link>

          <Link to="/contact">
            Contact Us
          </Link>

        </div>

      </div>

    </div>

  );
};

export default Navbar;