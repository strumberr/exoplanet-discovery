'use client'

import axios from 'axios'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupForm() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
    })
    const router = useRouter()

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            alert('Passwords do not match')
            return
        }

        try {
            const response = await axios.post(
                'http://localhost:3000/api/auth/signup',
                formData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )

            console.log('Response:', response)

            if (response.status === 200) {
                alert('User registered successfully')
                router.push('/login')
            } else {
                console.error('Error response:', response.data)
                alert(
                    response.data.message ||
                        'An error occurred. Please try again.'
                )
            }
        } catch (error) {
            console.error('Axios error:', error)
            alert('An error occurred. Please try again.')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md"
            >
                <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
                    Sign Up
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
                <div className="mb-4">
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
                <div className="mb-6">
                    <input
                        type="password"
                        id="confirmPassword"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                confirmPassword: e.target.value,
                            })
                        }
                        className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 transition duration-300"
                >
                    Sign Up
                </button>
            </form>
        </div>
    )
}
