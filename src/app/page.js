import Image from 'next/image'
import '../app/globals.css'
import '../app/page.css'

export default function Home() {
    return (
        <div className="bg min-h-screen bg-[#0a0a0a] flex flex-col justify-center items-center text-white">
            <h1 className="text-5xl font-bold mt-5">Galactic Conquest</h1>
            <div className="flex space-x-6 mt-60 p-20">
                <a
                    href="/sign-up"
                    className="px-8 py-3 bg-red-600 text-white rounded-lg text-lg hover:bg-red-700 transition"
                    style={{ marginBottom: '1rem' }}
                >
                    Play Now
                </a>
            </div>
            <div className="flex space-x-6">
                <a
                    href="/login"
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg text-lg hover:bg-blue-700 transition mr-20"
                >
                    Login
                </a>
                <a
                    href="/sign-up"
                    className="px-8 py-3 bg-green-600 text-white rounded-lg text-lg hover:bg-green-700 transition"
                >
                    Sign Up
                </a>
            </div>
            <footer className="w-full bg-gray-900 text-white py-6 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-sm">
                        Galactic Conquest is a thrilling space strategy game
                        where you explore the universe, collect exoplanets, and
                        build your galactic empire. Conquer other planets with
                        your powerful troops and become the ruler of the cosmos.
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                        © 2024 Galactic Conquest. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
