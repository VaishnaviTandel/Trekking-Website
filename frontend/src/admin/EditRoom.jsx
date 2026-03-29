import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";

const createRoomType = () => ({
  clientId: `type_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  _id: "",
  label: "",
  shareType: "single",
  acType: "ac",
  occupancy: 1,
  totalRooms: "",
  pricePerNight: "",
  description: "",
  isActive: true,
  images: []
});

const imageUrl = (path = "") => {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `http://localhost:5000/uploads/${path}`;
};

export default function EditRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState({
    name: "",
    location: "",
    address: "",
    description: "",
    amenities: "",
    nearbyLandmarks: "",
    checkInTime: "12:00",
    checkOutTime: "10:00"
  });
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [existingCover, setExistingCover] = useState("");
  const [existingGallery, setExistingGallery] = useState([]);
  const [deletedGalleryImages, setDeletedGalleryImages] = useState([]);
  const [roomTypes, setRoomTypes] = useState([createRoomType()]);
  const [roomTypeUploads, setRoomTypeUploads] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/rooms/${id}`);
        const data = response.data;

        setRoom({
          name: data.name || "",
          location: data.location || "",
          address: data.address || "",
          description: data.description || "",
          amenities: Array.isArray(data.amenities) ? data.amenities.join(", ") : "",
          nearbyLandmarks: Array.isArray(data.nearbyLandmarks)
            ? data.nearbyLandmarks.join(", ")
            : "",
          checkInTime: data.checkInTime || "12:00",
          checkOutTime: data.checkOutTime || "10:00"
        });

        setExistingCover(data.coverImage || "");
        setExistingGallery(Array.isArray(data.gallery) ? data.gallery : []);

        if (Array.isArray(data.roomTypes) && data.roomTypes.length > 0) {
          setRoomTypes(
            data.roomTypes.map((type) => ({
              clientId: `type_${String(type._id || "") || Math.random().toString(36).slice(2, 8)}`,
              _id: String(type._id || ""),
              label: type.label || "",
              shareType: type.shareType || "single",
              acType: type.acType || "ac",
              occupancy: Number(type.occupancy || 1),
              totalRooms: Number(type.totalRooms || 0),
              pricePerNight: Number(type.pricePerNight || 0),
              description: type.description || "",
              isActive: type.isActive !== false,
              images: Array.isArray(type.images) ? type.images : []
            }))
          );
        } else {
          setRoomTypes([createRoomType()]);
        }
      } catch (_error) {
        alert("Failed to load room.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [id]);

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

  const deleteExistingCoverImage = () => {
    setExistingCover("");
    setCoverImage(null);
    setCoverImagePreview(null);
  };

  const deleteExistingGalleryImage = (imageName) => {
    setExistingGallery((current) => current.filter((img) => img !== imageName));
    setDeletedGalleryImages((current) => [...current, imageName]);
  };

  const removeNewGalleryImage = (index) => {
    setGallery((current) => current.filter((_, i) => i !== index));
    setGalleryPreviews((current) => current.filter((_, i) => i !== index));
  };

  const handleRoomTypeChange = (index, field, value) => {
    setRoomTypes((current) =>
      current.map((type, rowIndex) =>
        rowIndex === index
          ? {
              ...type,
              [field]: value
            }
          : type
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

  const removeExistingTypeImage = (index, imageIndex) => {
    setRoomTypes((current) =>
      current.map((type, rowIndex) =>
        rowIndex === index
          ? {
              ...type,
              images: (Array.isArray(type.images) ? type.images : []).filter(
                (_, idx) => idx !== imageIndex
              )
            }
          : type
      )
    );
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
      _id: type._id || undefined,
      label: type.label,
      shareType: type.shareType,
      acType: type.acType,
      occupancy: Number(type.occupancy) || 1,
      totalRooms: Number(type.totalRooms) || 0,
      pricePerNight: Number(type.pricePerNight) || 0,
      description: type.description || "",
      isActive: type.isActive !== false,
      images: Array.isArray(type.images) ? type.images : []
    }));

    if (!validTypes.length) {
      alert("Please keep at least one room type.");
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

      if (deletedGalleryImages.length > 0) {
        payload.append("deletedGalleryImages", JSON.stringify(deletedGalleryImages));
      }

      validRows.forEach((row, index) => {
        const files = Array.isArray(roomTypeUploads[row.clientId])
          ? roomTypeUploads[row.clientId]
          : [];

        files.forEach((file) => {
          payload.append(`roomTypeImages_${index}`, file);
        });
      });

      await axios.put(`http://localhost:5000/api/rooms/${id}`, payload);
      alert("Room updated successfully.");
      navigate("/admin/rooms");
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to update room.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">Loading room details...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Edit Room</h2>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1 font-semibold">Property Name</label>
              <input
                name="name"
                value={room.name}
                onChange={handleRoomChange}
                className="w-full border p-2 rounded"
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
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Amenities (comma separated)</label>
              <input
                name="amenities"
                value={room.amenities}
                onChange={handleRoomChange}
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Nearby Landmarks (comma separated)</label>
              <input
                name="nearbyLandmarks"
                value={room.nearbyLandmarks}
                onChange={handleRoomChange}
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Cover Image</label>
              {existingCover && (
                <div className="mb-3 relative inline-block">
                  <img
                    src={imageUrl(existingCover)}
                    alt="Existing cover"
                    className="w-32 h-24 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={deleteExistingCoverImage}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-sm flex items-center justify-center hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              )}
              {coverImagePreview && (
                <div className="mb-3 relative inline-block ml-3">
                  <img
                    src={coverImagePreview}
                    alt="New cover preview"
                    className="w-32 h-24 object-cover rounded border-2 border-blue-400"
                  />
                  <span className="text-xs text-blue-600 font-semibold absolute -bottom-5 left-0">New Image</span>
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
              {existingGallery.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-700 font-semibold mb-2">Current gallery: {existingGallery.length} image(s)</p>
                  <div className="flex flex-wrap gap-3">
                    {existingGallery.map((imageName, index) => (
                      <div key={index} className="relative inline-block group">
                        <img
                          src={imageUrl(imageName)}
                          alt={`Gallery ${index + 1}`}
                          className="w-24 h-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => deleteExistingGalleryImage(imageName)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-sm flex items-center justify-center hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {galleryPreviews.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-blue-700 font-semibold mb-2">New images to add: {galleryPreviews.length}</p>
                  <div className="flex flex-wrap gap-3">
                    {galleryPreviews.map((item, index) => (
                      <div key={index} className="relative inline-block group">
                        <img
                          src={item.preview}
                          alt={`New ${index + 1}`}
                          className="w-24 h-20 object-cover rounded border-2 border-blue-400"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewGalleryImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-sm flex items-center justify-center hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <input
                type="file"
                multiple
                onChange={handleGalleryImageChange}
                className="w-full border p-2 rounded"
              />
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
                        className="sm:col-span-3 border p-2 rounded"
                        placeholder="Variant label"
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
                      />

                      <input
                        type="number"
                        min="0"
                        value={type.totalRooms}
                        onChange={(event) => handleRoomTypeChange(index, "totalRooms", event.target.value)}
                        className="sm:col-span-1 border p-2 rounded"
                      />

                      <input
                        type="number"
                        min="0"
                        value={type.pricePerNight}
                        onChange={(event) => handleRoomTypeChange(index, "pricePerNight", event.target.value)}
                        className="sm:col-span-2 border p-2 rounded"
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
                        className="sm:col-span-11 border p-2 rounded"
                      />

                      <label className="sm:col-span-1 text-sm text-gray-700 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={type.isActive !== false}
                          onChange={(event) => handleRoomTypeChange(index, "isActive", event.target.checked)}
                        />
                        Active
                      </label>
                    </div>

                    <div className="mt-3">
                      <label className="block mb-1 text-sm font-semibold">Variant Images</label>

                      {Array.isArray(type.images) && type.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {type.images.map((img, imageIndex) => (
                            <div key={`${img}-${imageIndex}`} className="relative">
                              <img
                                src={imageUrl(img)}
                                alt={`Variant ${type.label} ${imageIndex + 1}`}
                                className="w-16 h-12 rounded object-cover border"
                              />
                              <button
                                type="button"
                                onClick={() => removeExistingTypeImage(index, imageIndex)}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px]"
                                aria-label="Remove image"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <input
                        type="file"
                        multiple
                        onChange={(event) => handleRoomTypeImagesUpload(index, event.target.files)}
                        className="w-full border p-2 rounded"
                      />
                      {Array.isArray(roomTypeUploads[type.clientId]) &&
                        roomTypeUploads[type.clientId].length > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            {roomTypeUploads[type.clientId].length} new image(s) selected.
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
                {submitting ? "Updating..." : "Update Room"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
