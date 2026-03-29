import axios from "axios";

const API = "https://southfriends.onrender.com/api/trips";

export const getTrips = async () => {
  const res = await axios.get(API);
  return res.data;
};

export const getTripById = async (id) => {
  const res = await axios.get(`${API}/${id}`);
  return res.data;
};

export const createTrip = async (trip) => {
  const res = await axios.post(API, trip);
  return res.data;
};

export const updateTrip = async (id, trip) => {
  const res = await axios.put(`${API}/${id}`, trip);
  return res.data;
};

export const deleteTrip = async (id) => {
  const res = await axios.delete(`${API}/${id}`);
  return res.data;
};