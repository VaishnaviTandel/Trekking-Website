import { useNavigate, useParams } from "react-router-dom";
import { useBooking } from "../../context/BookingContext";

const SelectStep = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bookingData, setBookingData } = useBooking();

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold">Select Date</h2>

      <input
        type="date"
        className="border p-2 mt-4 w-full"
        onChange={(e) =>
          setBookingData({ ...bookingData, tripId: id, date: e.target.value })
        }
      />

      <input
        type="number"
        className="border p-2 mt-4 w-full"
        value={bookingData.participants}
        onChange={(e) =>
          setBookingData({ ...bookingData, participants: e.target.value })
        }
      />

      <button
        onClick={() => navigate(`/booking/${id}/details`)}
        className="mt-6 w-full bg-green-600 text-white py-2 rounded"
      >
        Next →
      </button>
    </div>
  );
};

export default SelectStep;