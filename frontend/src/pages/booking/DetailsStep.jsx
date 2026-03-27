import { useNavigate } from "react-router-dom";
import { useBooking } from "../../context/BookingContext";
import { useEffect } from "react";

const DetailsStep = () => {
  const navigate = useNavigate();
  const { bookingData, setBookingData } = useBooking();

  // 🔁 Auto create participants array
  useEffect(() => {
    const count = bookingData.participantsCount;
    let arr = [...bookingData.participants];

    if (arr.length < count) {
      for (let i = arr.length; i < count; i++) {
        arr.push({ name: "", age: "", gender: "Male" });
      }
    } else {
      arr.splice(count);
    }

    setBookingData((prev) => ({ ...prev, participants: arr }));
  }, [bookingData.participantsCount]);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold">Traveler Details</h2>

      {/* 🧍 PRIMARY PERSON */}
      <h3 className="mt-4 font-semibold">Primary Contact</h3>

      <input
        placeholder="Name"
        className="border p-2 w-full mt-2"
        onChange={(e) =>
          setBookingData({
            ...bookingData,
            primaryPerson: {
              ...bookingData.primaryPerson,
              name: e.target.value,
            },
          })
        }
      />

      <input
        placeholder="Age"
        className="border p-2 w-full mt-2"
        onChange={(e) =>
          setBookingData({
            ...bookingData,
            primaryPerson: {
              ...bookingData.primaryPerson,
              age: e.target.value,
            },
          })
        }
      />

      <select
        className="border p-2 w-full mt-2"
        onChange={(e) =>
          setBookingData({
            ...bookingData,
            primaryPerson: {
              ...bookingData.primaryPerson,
              gender: e.target.value,
            },
          })
        }
      >
        <option>Male</option>
        <option>Female</option>
      </select>

      <input
        placeholder="Phone"
        className="border p-2 w-full mt-2"
        onChange={(e) =>
          setBookingData({
            ...bookingData,
            primaryPerson: {
              ...bookingData.primaryPerson,
              phone: e.target.value,
            },
          })
        }
      />

      <input
        placeholder="Email"
        className="border p-2 w-full mt-2"
        onChange={(e) =>
          setBookingData({
            ...bookingData,
            primaryPerson: {
              ...bookingData.primaryPerson,
              email: e.target.value,
            },
          })
        }
      />

      {/* 👥 OTHER PARTICIPANTS */}
      <h3 className="mt-6 font-semibold">Other Participants</h3>

      {bookingData.participants.map((p, i) => (
        <div key={i} className="border p-3 mt-3 rounded">
          <p className="font-semibold">Person {i + 1}</p>

          <input
            placeholder="Name"
            className="border p-2 w-full mt-2"
            onChange={(e) => {
              const arr = [...bookingData.participants];
              arr[i].name = e.target.value;
              setBookingData({ ...bookingData, participants: arr });
            }}
          />

          <input
            placeholder="Age"
            className="border p-2 w-full mt-2"
            onChange={(e) => {
              const arr = [...bookingData.participants];
              arr[i].age = e.target.value;
              setBookingData({ ...bookingData, participants: arr });
            }}
          />

          <select
            className="border p-2 w-full mt-2"
            onChange={(e) => {
              const arr = [...bookingData.participants];
              arr[i].gender = e.target.value;
              setBookingData({ ...bookingData, participants: arr });
            }}
          >
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>
      ))}

      {/* NAVIGATION */}
      <div className="flex justify-between mt-6">
        <button onClick={() => navigate(-1)}>← Back</button>

        <button
          onClick={() => navigate(`/booking/${bookingData.tripId}/review`)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default DetailsStep;