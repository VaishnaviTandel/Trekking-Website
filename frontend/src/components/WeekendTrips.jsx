const WeekendTrips = () => {

  return (

    <div className="py-16 bg-gray-100">

      <h2 className="text-3xl font-bold text-center mb-10">
        Weekend Trips
      </h2>

      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 px-6">

        <div className="relative">

          <img src={trip.coverImage} alt={trip.title} />

          <div className="absolute bottom-4 left-4 text-white">

            <h3 className="text-xl font-bold">
              Treks in Mumbai
            </h3>

            <p>Starting ₹699</p>

          </div>

        </div>

        <div className="relative">

          <img
src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429"
alt="Treks in Pune"
className="rounded-lg"
/>
          <div className="absolute bottom-4 left-4 text-white">

            <h3 className="text-xl font-bold">
              Treks in Pune
            </h3>

          </div>

        </div>

        <div className="relative">

          

<img
src="https://images.unsplash.com/photo-1469474968028-56623f02e42e"
alt="Himachal Treks"
className="rounded-lg"
/>

          <div className="absolute bottom-4 left-4 text-white">

            <h3 className="text-xl font-bold">
              Himachal Treks
            </h3>

          </div>

        </div>

      </div>

    </div>

  );

};

export default WeekendTrips;