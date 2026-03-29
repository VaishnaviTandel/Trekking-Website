import { useEffect, useMemo, useState } from "react";

const formatShareType = (shareType = "") => {
  const mapping = {
    single: "Single bed",
    double: "Double bed",
    triple: "Triple share",
    quad: "Quad share",
    dorm: "Dormitory",
    custom: "Custom type"
  };

  return mapping[String(shareType).toLowerCase()] || "Room type";
};

const formatAcType = (acType = "") =>
  String(acType).toLowerCase() === "non_ac" ? "Non-AC" : "AC";

export default function RoomTypeDetailsModal({
  isOpen,
  onClose,
  roomName,
  type,
  availableRooms,
  images,
  roomAmenities,
  nearbyLandmarks,
  toImageUrl
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setSelectedImageIndex(0);
    }
  }, [isOpen, type?._id]);

  const gallery = useMemo(
    () => (Array.isArray(images) ? images.filter(Boolean) : []),
    [images]
  );

  if (!isOpen || !type) {
    return null;
  }

  const imageCount = gallery.length;
  const safeImageIndex = imageCount > 0 ? Math.min(selectedImageIndex, imageCount - 1) : 0;
  const currentImage = imageCount > 0 ? gallery[safeImageIndex] : "";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid lg:grid-cols-[1.3fr,1fr]">
          <div className="bg-gray-100 p-3 sm:p-4">
            <div className="relative">
              {currentImage ? (
                <img
                  src={toImageUrl(currentImage)}
                  alt={`${type.label} view ${safeImageIndex + 1}`}
                  className="w-full h-[240px] sm:h-[360px] object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-[240px] sm:h-[360px] rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">
                  No image available
                </div>
              )}

              {imageCount > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImageIndex((current) =>
                        current === 0 ? imageCount - 1 : current - 1
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white"
                    aria-label="Previous image"
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImageIndex((current) =>
                        current === imageCount - 1 ? 0 : current + 1
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white"
                    aria-label="Next image"
                  >
                    {">"}
                  </button>
                </>
              )}
            </div>

            {imageCount > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`shrink-0 border rounded-lg overflow-hidden ${
                      safeImageIndex === index ? "border-green-500" : "border-gray-200"
                    }`}
                    aria-label={`Show image ${index + 1}`}
                  >
                    <img src={toImageUrl(image)} alt="" className="w-20 h-14 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative p-4 sm:p-6">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 text-gray-500 hover:text-gray-800 text-2xl leading-none"
              aria-label="Close room details"
            >
              x
            </button>

            <p className="text-sm text-gray-500">{roomName}</p>
            <h3 className="text-2xl font-bold pr-8">{type.label}</h3>

            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-700">
                {formatShareType(type.shareType)}
              </span>
              <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-700">
                {formatAcType(type.acType)}
              </span>
              <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-700">
                Occupancy {type.occupancy}
              </span>
              <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-700">
                Available {Math.max(0, Number(availableRooms) || 0)}
              </span>
            </div>

            <p className="mt-4 text-green-700 text-xl font-bold">
              INR {Number(type.pricePerNight || 0).toLocaleString("en-IN")} / night
            </p>

            <div className="mt-5">
              <h4 className="font-semibold text-gray-900">About this room</h4>
              <p className="text-gray-700 mt-2 whitespace-pre-line">
                {type.description || "Details will be updated by admin soon."}
              </p>
            </div>

            {Array.isArray(roomAmenities) && roomAmenities.length > 0 && (
              <div className="mt-5">
                <h4 className="font-semibold text-gray-900">Facilities</h4>
                <div className="mt-2 grid sm:grid-cols-2 gap-2 text-sm text-gray-700">
                  {roomAmenities.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(nearbyLandmarks) && nearbyLandmarks.length > 0 && (
              <div className="mt-5">
                <h4 className="font-semibold text-gray-900">Nearby</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {nearbyLandmarks.map((item) => (
                    <span key={item} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
