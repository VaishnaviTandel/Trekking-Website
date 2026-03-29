import { useState } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";

const createRoomType = () => ({
  clientId: `type_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  label: "",
  shareType: "single",
  acType: "ac",
  occupancy: 1,
  totalRooms: "",
  pricePerNight: "",
  description: "",
  images: []
});

const emptyRoom = {
  name: "",
  location: "",
  address: "",
  description: "",
  amenities: "",
  nearbyLandmarks: "",
  checkInTime: "12:00",
  checkOutTime: "10:00"
};

export default function AddRoom() {
  const [room, setRoom] = useState(emptyRoom);
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [roomTypes, setRoomTypes] = useState([createRoomType()]);
  const [roomTypeUploads, setRoomTypeUploads] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleRoomChange = (event) => {
    const { name, value } = event.target;
    setRoom((current) => ({ ...current, [name]: value }));
  };

  const handleCoverImageChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setCoverImagePreview(e.target?.result);
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    setGallery(files);
    const previews = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ file, preview: e.target?.result });
        reader.readAsDataURL(file);
      });
    });
    Promise.all(previews).then((results) => {
      setGalleryPreviews(results);
    });
  };

  const removeGalleryImage = (index) => {
    setGallery((current) => current.filter((_, i) => i !== index));
    setGalleryPreviews((current) => current.filter((_, i) => i !== index));
  };

  const clearCoverImage = () => {
    setCoverImage(null);
    setCoverImagePreview(null);
  };

  const handleRoomTypeChange = (index, field, value) => {
    setRoomTypes((current) =>
      current.map((roomType, rowIndex) =>
        rowIndex === index
          ? {
              ...roomType,
              [field]: value
            }
          : roomType
      )
    );
  };

  const handleRoomTypeImagesUpload = (index, files) => {
    const selectedFiles = Array.from(files || []);

    setRoomTypes((current) => {
      const target = current[index];

      if (!target) {
        return current;
      }

      setRoomTypeUploads((uploads) => ({
        ...uploads,
        [target.clientId]: selectedFiles
      }));

      return current;
    });
  };

  const addRoomTypeRow = () => {
    setRoomTypes((current) => [...current, createRoomType()]);
  };

  const removeRoomTypeRow = (index) => {
    setRoomTypes((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      const removed = current[index];

      if (removed?.clientId) {
        setRoomTypeUploads((uploads) => {
          const copy = { ...uploads };
          delete copy[removed.clientId];
          return copy;
        });
      }

      return next.length > 0 ? next : [createRoomType()];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validRows = roomTypes.filter(
      (type) => type.label && type.totalRooms !== "" && type.pricePerNight !== ""
    );

    const validTypes = validRows.map((type) => ({
      label: type.label,
      shareType: type.shareType,
      acType: type.acType,
      occupancy: Number(type.occupancy) || 1,
      totalRooms: Number(type.totalRooms) || 0,
      pricePerNight: Number(type.pricePerNight) || 0,
      description: type.description || "",
      images: Array.isArray(type.images) ? type.images : []
    }));

    if (!validTypes.length) {
      alert("Please add at least one room type with price and availability.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("name", room.name);
      payload.append("location", room.location);
      payload.append("address", room.address);
      payload.append("description", room.description);
      payload.append("amenities", room.amenities);
      payload.append("nearbyLandmarks", room.nearbyLandmarks);
      payload.append("checkInTime", room.checkInTime);
      payload.append("checkOutTime", room.checkOutTime);
      payload.append("roomTypes", JSON.stringify(validTypes));

      if (coverImage) {
        payload.append("coverImage", coverImage);
      }

      gallery.forEach((file) => {
        payload.append("gallery", file);
      });

      validRows.forEach((row, index) => {
        const files = Array.isArray(roomTypeUploads[row.clientId])
          ? roomTypeUploads[row.clientId]
          : [];

        files.forEach((file) => {
          payload.append(`roomTypeImages_${index}`, file);
        });
      });

      await axios.post("http://localhost:5000/api/rooms", payload);
      alert("Room added successfully.");

      setRoom(emptyRoom);
      setCoverImage(null);
      setGallery([]);
      setRoomTypes([createRoomType()]);
      setRoomTypeUploads({});
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to add room.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Add New Room</h2>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1 font-semibold">Property Name</label>
              <input
                name="name"
                value={room.name}
                onChange={handleRoomChange}
                className="w-full border p-2 rounded"
                placeholder="Green Valley Stay"
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Location</label>
              <input
                name="location"
                value={room.location}
                onChange={handleRoomChange}
                className="w-full border p-2 rounded"
                placeholder="Coorg"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 font-semibold">Address</label>
              <input
                name="address"
                value={room.address}
                onChange={handleRoomChange}
                className="w-full border p-2 rounded"
                placeholder="Madikeri Main Road, Coorg"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Check-in Time</label>
              <input
                type="time"
                name="checkInTime"
                value={room.checkInTime}
                onChange={handleRoomChange}
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Check-out Time</label>
              <input
                type="time"
                name="checkOutTime"
                value={room.checkOutTime}
                onChange={handleRoomChange}
                className="w-full border p-2 rounded"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 font-semibold">Description</label>
              <textarea
                name="description"
                value={room.description}
                onChange={handleRoomChange}
                className="w-full border p-2 rounded h-24"
                placeholder="Property overview..."
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Amenities (comma separated)</label>
              <input
                name="amenities"
                value={room.amenities}
                onChange={handleRoomChange}
                className="w-full border p-2 rounded"
                placeholder="Wifi, Parking, Hot Water"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Nearby Landmarks (comma separated)</label>
              <input
                name="nearbyLandmarks"
                value={room.nearbyLandmarks}
                onChange={handleRoomChange}
                className="w-full border p-2 rounded"
                placeholder="Bus Stand, River Side"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Cover Image</label>
              {coverImagePreview && (
                <div className="mb-3 relative inline-block">
                  <img
                    src={coverImagePreview}
                    alt="Cover preview"
                    className="w-32 h-24 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={clearCoverImage}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-sm flex items-center justify-center hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              )}
              <input
                type="file"
                onChange={handleCoverImageChange}
                className="w-full border p-2 rounded"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 font-semibold">Gallery Images</label>
              {galleryPreviews.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-3">
                  {galleryPreviews.map((item, index) => (
                    <div key={index} className="relative inline-block group">
                      <img
                        src={item.preview}
                        alt={`Gallery ${index + 1}`}
                        className="w-24 h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-sm flex items-center justify-center hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                multiple
                onChange={handleGalleryImageChange}
                className="w-full border p-2 rounded"
              />
              {galleryPreviews.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">{galleryPreviews.length} image(s) selected</p>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <label className="font-semibold">Room Variants</label>
                <button
                  type="button"
                  onClick={addRoomTypeRow}
                  className="bg-gray-900 text-white text-sm px-4 py-2 rounded hover:bg-black"
                >
                  Add Variant
                </button>
              </div>

              <div className="space-y-4">
                {roomTypes.map((type, index) => (
                  <div key={type.clientId} className="border rounded-lg p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <input
                        type="text"
                        value={type.label}
                        onChange={(event) => handleRoomTypeChange(index, "label", event.target.value)}
                        placeholder="Single Share AC"
                        className="sm:col-span-3 border p-2 rounded"
                      />

                      <select
                        value={type.shareType}
                        onChange={(event) => handleRoomTypeChange(index, "shareType", event.target.value)}
                        className="sm:col-span-2 border p-2 rounded"
                      >
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="triple">Triple</option>
                        <option value="quad">Quad</option>
                        <option value="dorm">Dorm</option>
                      </select>

                      <select
                        value={type.acType}
                        onChange={(event) => handleRoomTypeChange(index, "acType", event.target.value)}
                        className="sm:col-span-2 border p-2 rounded"
                      >
                        <option value="ac">AC</option>
                        <option value="non_ac">Non-AC</option>
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={type.occupancy}
                        onChange={(event) => handleRoomTypeChange(index, "occupancy", event.target.value)}
                        className="sm:col-span-1 border p-2 rounded"
                        placeholder="Occ"
                      />

                      <input
                        type="number"
                        min="0"
                        value={type.totalRooms}
                        onChange={(event) => handleRoomTypeChange(index, "totalRooms", event.target.value)}
                        className="sm:col-span-1 border p-2 rounded"
                        placeholder="Qty"
                      />

                      <input
                        type="number"
                        min="0"
                        value={type.pricePerNight}
                        onChange={(event) => handleRoomTypeChange(index, "pricePerNight", event.target.value)}
                        className="sm:col-span-2 border p-2 rounded"
                        placeholder="Price"
                      />

                      <button
                        type="button"
                        onClick={() => removeRoomTypeRow(index)}
                        className="sm:col-span-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                      >
                        X
                      </button>

                      <input
                        type="text"
                        value={type.description}
                        onChange={(event) => handleRoomTypeChange(index, "description", event.target.value)}
                        placeholder="Variant description"
                        className="sm:col-span-12 border p-2 rounded"
                      />
                    </div>

                    <div className="mt-3">
                      <label className="block mb-1 text-sm font-semibold">Variant Images</label>
                      <input
                        type="file"
                        multiple
                        onChange={(event) => handleRoomTypeImagesUpload(index, event.target.files)}
                        className="w-full border p-2 rounded"
                      />
                      {Array.isArray(roomTypeUploads[type.clientId]) &&
                        roomTypeUploads[type.clientId].length > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            {roomTypeUploads[type.clientId].length} image(s) selected for this room type.
                          </p>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? "Saving..." : "Add Room"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
