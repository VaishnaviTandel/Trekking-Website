const Hero = () => {

  return (

    <div
      className="h-[500px] bg-cover bg-center flex items-center justify-center"
      style={{
        backgroundImage:
          "url(https://images.unsplash.com/photo-1501785888041-af3ef285b470)"
      }}
    >

      <div className="text-center text-white">

        <h1 className="text-5xl font-bold mb-4">
          Himachal Tours
        </h1>

        <p className="text-xl mb-6">
          Group Trips Every Friday & Saturday
        </p>

        <button className="bg-green-500 px-6 py-3 rounded-lg">
          View Packages
        </button>

      </div>

    </div>

  );

};

export default Hero;