import { useState, useEffect } from "react";

export function useOnlineStatus(interval = 2000) {
    const [isOnline, setIsOnline] = useState(navigator.onLine)

    useEffect(() => {
        let cancelled = false

        const check = async () => {
            // First check navigator.onLine
            if (!navigator.onLine) {
                if (!cancelled) {
                    console.log("[Online Status] Browser reports OFFLINE (navigator.onLine)")
                    setIsOnline(false)
                }
                return
            }

            // If browser says online, verify with actual network request to external server
            try {
                await fetch("https://jsonplaceholder.typicode.com/posts", {
                    method: "HEAD",
                    cache: "no-store",
                })
                if (!cancelled) {
                    console.log("[Online Status] Network is ONLINE (dummyjson.com reachable)")
                    setIsOnline(true)
                }
            } catch (error) {
                if (!cancelled) {
                    console.log("[Online Status] Network is OFFLINE (dummyjson.com unreachable)")
                    setIsOnline(false)
                }
            }
        }

        // Also listen to browser online/offline events
        const handleOnline = () => {
            console.log("[Online Status] Browser online event")
            check()
        }
        const handleOffline = () => {
            console.log("[Online Status] Browser offline event")
            setIsOnline(false)
        }

        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)

        check()
        const id = setInterval(check, interval)

        return () => {
            cancelled = true
            clearInterval(id)
            window.removeEventListener("online", handleOnline)
            window.removeEventListener("offline", handleOffline)
        }
    }, [interval])

    return isOnline
}
