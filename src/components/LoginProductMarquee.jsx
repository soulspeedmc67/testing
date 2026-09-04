const ROW1 = [
  { img: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=150&auto=format&fit=crop&q=80", bg: "bg-sky-100/70" },
  { img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80", bg: "bg-orange-100/70" },
  { img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=150&auto=format&fit=crop&q=80", bg: "bg-amber-100/70" },
  { img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=150&auto=format&fit=crop&q=80", bg: "bg-rose-100/70" },
];

const ROW2 = [
  { img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=150&auto=format&fit=crop&q=80", bg: "bg-yellow-100/70" },
  { img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&auto=format&fit=crop&q=80", bg: "bg-purple-100/70" },
  { img: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=150&auto=format&fit=crop&q=80", bg: "bg-orange-100/70" },
  { img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150&auto=format&fit=crop&q=80", bg: "bg-[#fef3c7]" },
];

export default function LoginProductMarquee() {
  return (
    <div className="relative py-4 overflow-hidden space-y-3 opacity-95">
      {/* Row 1: Left Drifting Marquee */}
      <div className="flex space-x-3 w-[200%] animate-marquee-left">
        {[...ROW1, ...ROW1, ...ROW1].map((item, idx) => (
          <div
            key={idx}
            className={`${item.bg} h-20 w-20 shrink-0 rounded-3xl p-3 flex items-center justify-center border border-white shadow-sm`}
          >
            <img src={item.img} alt="Product" className="h-14 w-14 object-contain rounded-xl" />
          </div>
        ))}
      </div>

      {/* Row 2: Right Drifting Marquee */}
      <div className="flex space-x-3 w-[200%] animate-marquee-right">
        {[...ROW2, ...ROW2, ...ROW2].map((item, idx) => (
          <div
            key={idx}
            className={`${item.bg} h-20 w-20 shrink-0 rounded-3xl p-3 flex items-center justify-center border border-white shadow-sm`}
          >
            <img src={item.img} alt="Product" className="h-14 w-14 object-contain rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
