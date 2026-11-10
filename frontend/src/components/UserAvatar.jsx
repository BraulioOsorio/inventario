import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { avatarHue, getInitials } from "../utils/userDisplay";

export default function UserAvatar({
  user,
  size = "md",
  className = "",
  title,
}) {
  const { token } = useAuth();
  const name = user?.full_name;
  const [src, setSrc] = useState(user?.avatar_base64 || null);
  const hue = avatarHue(name);
  const initials = getInitials(name);
  const gradient = `linear-gradient(135deg, hsl(${hue} 68% 52%), hsl(${(hue + 40) % 360} 72% 58%))`;

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    async function load() {
      if (user?.avatar_base64) {
        setSrc(user.avatar_base64);
        return;
      }
      if (!user?.has_avatar || !token) {
        setSrc(null);
        return;
      }
      try {
        const blob = await api.fetchMyAvatarBlob(token);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setSrc(null);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user?.id, user?.avatar_base64, user?.has_avatar, token]);

  if (src) {
    return (
      <img
        src={src}
        alt={title || name || "Avatar"}
        className={`user-avatar-img user-avatar-${size} ${className}`}
        title={title}
      />
    );
  }

  return (
    <span
      className={`avatar avatar-gradient user-avatar-${size} ${className}`}
      style={{ background: gradient }}
      title={title}
      aria-hidden={!title}
    >
      {initials}
    </span>
  );
}
