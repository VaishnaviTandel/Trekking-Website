import { useEffect, useState } from "react";
import { getTrips } from "../services/api";
import TrekCard from "../components/TrekCard";

const Trips = () => {

  const [trips,setTrips] = useState([]);

  useEffect(()=>{

    const fetchTrips = async () => {
      const data = await getTrips();
      setTrips(data);
    }

    fetchTrips();

  },[])

  return (

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <h1 className="text-3xl font-bold mb-8 text-center">
        All Treks
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">

        {trips.map(trip => (
          <TrekCard key={trip._id} trip={trip}/>
        ))}

      </div>

    </div>

  );

};

export default Trips;
