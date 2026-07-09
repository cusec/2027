"use client";

import { useEffect, useState } from 'react';

const PHONE_MEDIA_QUERY = '(max-width: 640px) and (pointer: coarse)';

export default function useIsPhone() {
    const [isPhone, setIsPhone] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(PHONE_MEDIA_QUERY);
        const update = () => setIsPhone(media.matches);

        update();

        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    return isPhone;
}
