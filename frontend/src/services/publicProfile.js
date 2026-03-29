const API = "https://southfriends.onrender.com/api/admin/public-profile";

export const fetchPublicProfile = async () => {
  const response = await fetch(API);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Failed to fetch public profile.");
  }

  return data;
};
