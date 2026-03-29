import axios from "axios";

const ROOM_API = "http://localhost:5000/api/rooms";
const ROOM_BOOKING_API = "http://localhost:5000/api/room-bookings";

export const getRooms = async (params = {}) => {
  const response = await axios.get(ROOM_API, { params });
  return response.data;
};

export const getRoomById = async (id) => {
  const response = await axios.get(`${ROOM_API}/${id}`);
  return response.data;
};

export const getRoomAvailability = async (id, params = {}) => {
  const response = await axios.get(`${ROOM_API}/${id}/availability`, { params });
  return response.data;
};

export const createRoomBooking = async (payload) => {
  const response = await axios.post(ROOM_BOOKING_API, payload);
  return response.data;
};
