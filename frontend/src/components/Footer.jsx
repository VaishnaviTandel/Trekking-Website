const Footer = () => {

  return (

    <div className="bg-black text-white mt-20">

      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10 p-10">

        <div>
          <h3 className="font-bold mb-4">Trending Destinations</h3>
          <p>Monsoon Treks 2024</p>
          <p>Weekend Trips Mumbai</p>
          <p>Himachal Tours</p>
          <p>Winter Treks</p>
        </div>

        <div>
          <h3 className="font-bold mb-4">Address</h3>
          <p>Pune, Maharashtra</p>
          <p>India</p>
        </div>

        <div>
          <h3 className="font-bold mb-4">Company Info</h3>
          <p>About Us</p>
          <p>Privacy Policy</p>
          <p>Terms</p>
        </div>

        <div>
          <h3 className="font-bold mb-4">Support</h3>
          <p>support@trekplatform.com</p>
          <p>+91 9876543210</p>
        </div>

      </div>

      <div className="text-center border-t border-gray-700 py-4">
        © 2026 TrekPlatform
      </div>

    </div>

  );

};

export default Footer;