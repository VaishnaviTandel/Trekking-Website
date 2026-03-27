import { createContext, useContext, useState } from "react";

const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
 const [bookingData, setBookingData] = useState({
  tripId: "",
  date: "",
  participantsCount: 1,

  primaryPerson: {
    name: "",
    age: "",
    gender: "Male",
    phone: "",
    email: "",
  },

  participants: [],
});

  return (
    <BookingContext.Provider value={{ bookingData, setBookingData }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);