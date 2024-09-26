'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
    const [formData, setFormData] = useState({ username: '', password: '' })
    const router = useRouter()

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) {
            router.push('/world')
        }
    }, [router])

    const handleSubmit = async (e) => {
        e.preventDefault()

        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        })

        const data = await response.json()
        if (response.ok) {
            localStorage.setItem('token', data.token)
            alert('Login successful')
            router.push('/world')
        } else {
            alert(data.message)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md"
            >
                <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
                    Login
                </h2>
                <div className="mb-4">
                    <input
                        type="text"
                        id="username"
                        placeholder="Username"
                        value={formData.username}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                username: e.target.value,
                            })
                        }
                        className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="mb-6">
                    <input
                        type="password"
                        id="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                password: e.target.value,
                            })
                        }
                        className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 transition duration-300"
                >
                    Login
                </button>
            </form>
        </div>
    )
}
