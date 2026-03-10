import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";

const emptyTrip = {
  title: "",
  location: "",
  price: "",
  duration: "",
  durationDays: 1,
  difficulty: "",
  description: "",
  itinerary: ""
};

const emptyDeparture = {
  _id: null,
  batchLabel: "Batch A",
  date: "",
  totalSeats: "",
  bookedSeats: 0
};

const toInputDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
};

export default function EditTrip() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(emptyTrip);
  const [coverImage, setCoverImage] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [departures, setDepartures] = useState([{ ...emptyDeparture }]);

  useEffect(() => {
    const fetchTrip = async () => {
      const res = await axios.get(`http://localhost:5000/api/trips/${id}`);
      const data = res.data;

      setTrip({
        title: data.title || "",
        location: data.location || "",
        price: data.price || "",
        duration: data.duration || "",
        durationDays: data.durationDays || 1,
        difficulty: data.difficulty || "",
        description: data.description || "",
        itinerary: data.itinerary || ""
      });

      if (data.departures?.length) {
        setDepartures(
          data.departures.map((departure) => ({
            _id: departure._id,
            batchLabel: departure.batchLabel || "Standard Batch",
            date: toInputDate(departure.date),
            totalSeats: departure.totalSeats,
            bookedSeats: departure.bookedSeats || 0
          }))
        );
      }
    };

    fetchTrip();
  }, [id]);

  const handleChange = (e) => {
    setTrip({
      ...trip,
      [e.target.name]: e.target.value
    });
  };

  const handleDepartureChange = (index, field, value) => {
    setDepartures((current) =>
      current.map((departure, depIndex) =>
        depIndex === index
          ? {
              ...departure,
              [field]: value
            }
          : departure
      )
    );
  };

  const addDepartureRow = () => {
    setDepartures((current) => [...current, { ...emptyDeparture }]);
  };

  const removeDepartureRow = (index) => {
    setDepartures((current) => current.filter((_, depIndex) => depIndex !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validDepartures = departures
      .filter((departure) => departure.date && departure.totalSeats)
      .map((departure) => ({
        _id: departure._id,
        batchLabel: departure.batchLabel || "Standard Batch",
        date: departure.date,
        totalSeats: Number(departure.totalSeats),
        bookedSeats: Number(departure.bookedSeats || 0)
      }));

    const invalidSeats = validDepartures.some(
      (departure) => departure.totalSeats < departure.bookedSeats
    );

    if (invalidSeats) {
      alert("Total seats cannot be less than already booked seats.");
      return;
    }

    const formData = new FormData();

    formData.append("title", trip.title);
    formData.append("location", trip.location);
    formData.append("price", trip.price);
    formData.append("duration", trip.duration);
    formData.append("durationDays", trip.durationDays);
    formData.append("difficulty", trip.difficulty);
    formData.append("description", trip.description);
    formData.append("itinerary", trip.itinerary);
    formData.append("departures", JSON.stringify(validDepartures));

    if (coverImage) {
      formData.append("coverImage", coverImage);
    }

    gallery.forEach((img) => {
      formData.append("gallery", img);
    });

    await axios.put(`http://localhost:5000/api/trips/${id}`, formData);

    alert("Trip Updated Successfully");

    navigate("/admin/trips");
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Edit Trip</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
          <div>
            <label className="font-semibold">Title</label>
            <input
              name="title"
              value={trip.title}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="font-semibold">Location</label>
            <input
              name="location"
              value={trip.location}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="font-semibold">Price</label>
            <input
              name="price"
              type="number"
              min="0"
              value={trip.price}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="font-semibold">Duration</label>
            <input
              name="duration"
              value={trip.duration}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="font-semibold">Duration (Days)</label>
            <input
              name="durationDays"
              type="number"
              min="1"
              value={trip.durationDays}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="font-semibold">Difficulty</label>
            <input
              name="difficulty"
              value={trip.difficulty}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="font-semibold">Cover Image</label>
            <input
              type="file"
              onChange={(e) => setCoverImage(e.target.files[0])}
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="col-span-2">
            <label className="font-semibold">Gallery Images</label>
            <input
              type="file"
              multiple
              onChange={(e) => setGallery([...e.target.files])}
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="col-span-2">
            <label className="font-semibold">Overview</label>
            <textarea
              name="description"
              value={trip.description}
              onChange={handleChange}
              className="w-full border p-2 rounded h-24"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="font-semibold">Itinerary</label>
            <textarea
              name="itinerary"
              value={trip.itinerary}
              onChange={handleChange}
              className="w-full border p-2 rounded h-24"
            />
          </div>

          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold">Departures</label>
              <button
                type="button"
                onClick={addDepartureRow}
                className="bg-gray-900 text-white text-sm px-4 py-2 rounded hover:bg-black"
              >
                Add Departure
              </button>
            </div>

            <div className="space-y-3">
              {departures.map((departure, index) => (
                <div key={departure._id || index} className="grid grid-cols-12 gap-3 items-center">
                  <input
                    type="text"
                    value={departure.batchLabel}
                    onChange={(e) => handleDepartureChange(index, "batchLabel", e.target.value)}
                    className="col-span-3 border p-2 rounded"
                    placeholder="Batch name"
                  />

                  <input
                    type="date"
                    value={departure.date}
                    onChange={(e) => handleDepartureChange(index, "date", e.target.value)}
                    className="col-span-3 border p-2 rounded"
                  />

                  <input
                    type="number"
                    min={departure.bookedSeats || 1}
                    placeholder="Seats"
                    value={departure.totalSeats}
                    onChange={(e) => handleDepartureChange(index, "totalSeats", e.target.value)}
                    className="col-span-2 border p-2 rounded"
                  />

                  <div className="col-span-2 text-sm text-gray-600">
                    Booked: {departure.bookedSeats || 0}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeDepartureRow(index)}
                    className="col-span-2 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                    disabled={departures.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700"
            >
              Update Trip
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
