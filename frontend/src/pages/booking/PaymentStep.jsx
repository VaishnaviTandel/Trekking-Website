import { useBooking } from "../../context/BookingContext";
import { useNavigate } from "react-router-dom";

const PaymentStep = () => {
  const { bookingData } = useBooking();
  const navigate = useNavigate();

  const total = bookingData.participants * 1000;

  const handlePayment = async () => {
    try {
      // 1️⃣ Create order from backend
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: total }),
      });

      const order = await orderRes.json();

      // 2️⃣ Razorpay options
      const options = {
        key: "YOUR_KEY_ID", // 🔥 replace with your key
        amount: order.amount,
        currency: "INR",
        name: "Trek Booking",
        description: "Trip Payment",
        order_id: order.id,

        handler: async function (response) {
          // 3️⃣ Verify payment (optional but recommended)
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(response),
          });

          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            // 4️⃣ SAVE BOOKING IN DB ✅
            await fetch("/api/bookings/create", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...bookingData,
                totalAmount: total,
                paymentId: response.razorpay_payment_id,
              }),
            });

            alert("Booking Confirmed 🎉");
            navigate("/booking/success");
          } else {
            alert("Payment verification failed ❌");
          }
        },

        theme: {
          color: "#16a34a",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Payment failed ❌");
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold">Payment</h2>

      <p className="mt-4 text-lg font-semibold">
        Total Amount: ₹{total}
      </p>

      <button
        onClick={handlePayment} // ✅ CONNECTED
        className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl"
      >
        Pay Now
      </button>
    </div>
  );
};

export default PaymentStep;