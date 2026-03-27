import { useNavigate } from "react-router-dom";
import { useBooking } from "../../context/BookingContext";

const ReviewStep = () => {
  const navigate = useNavigate();
  const { bookingData } = useBooking();

  const total = bookingData.participants * 1000;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold">Review Booking</h2>

      <div className="mt-4 bg-gray-100 p-4 rounded">
        <p><b>Name:</b> {bookingData.primaryPerson.name}</p>
<p><b>Phone:</b> {bookingData.primaryPerson.phone}</p>
<p><b>Email:</b> {bookingData.primaryPerson.email}</p>

{bookingData.participants.map((p, i) => (
  <p key={i}>
    {p.name} ({p.age}, {p.gender})
  </p>
))}

        <p className="mt-3 font-bold">Total: ₹{total}</p>
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-300 px-4 py-2 rounded"
        >
          ← Back
        </button>

        <button
          onClick={() => navigate(`/booking/${bookingData.tripId}/payment`)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Proceed to Payment →
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;