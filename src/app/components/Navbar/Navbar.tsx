import LocaleSwitcher from "./LocaleSwitcher"
import MotionToggle from "./MotionToggle"
export default function Navbar() {
    return (
        <div className="Navbar">
            <div className="Navbar-controls">
                <LocaleSwitcher/>
                <MotionToggle/>
            </div>
        </div>
    )
}
