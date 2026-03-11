import OrbAvatar from "@/components/avatars/OrbAvatar";
import CartoonAvatar from "@/components/avatars/CartoonAvatar";
import RobotAvatar from "@/components/avatars/RobotAvatar";
import HoloShieldAvatar from "@/components/avatars/HoloShieldAvatar";
import type { Mood } from "@/hooks/useCompanionMood";

export const renderGlobalAvatar = (size: number, mood?: string) => {
  const style = localStorage.getItem("avatar-style") || "orb";

  if (style === "image") {
    const url = localStorage.getItem("avatar-image-url");
    if (url) {
      return (
        <img
          src={url}
          alt="Avatar"
          style={{ width: size, height: size, objectFit: "cover", borderRadius: "50%" }}
        />
      );
    }
  }

  switch (style) {
    case "robot": return <RobotAvatar size={size} />;
    case "holo": return <HoloShieldAvatar size={size} />;
    case "cartoon": return <CartoonAvatar size={size} mood={mood as Mood} />;
    default: return <OrbAvatar size={size} />;
  }
};
