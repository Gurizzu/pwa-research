import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Book, FileText, ArrowRight } from "lucide-react"
import { useNavigate } from 'react-router-dom'

function HomePage() {
    const navigate = useNavigate()

    const sections = [
        {
            id: 'articles',
            title: 'Research Articles',
            description: 'Access our collection of Progressive Web App research articles with offline synchronization capabilities and advanced caching strategies.',
            icon: FileText,
            path: '/article',
            features: [
                'Offline Reading Support',
                'Real-time Sync Status',
                'Bookmark Management'
            ]
        },
        {
            id: 'library',
            title: 'Digital Library',
            description: 'Browse our curated digital library featuring technical publications and educational resources for modern web development.',
            icon: Book,
            path: '/library',
            features: [
                'Comprehensive Catalog',
                'Secure Checkout',
                'Order Management'
            ]
        }
    ]

    return (
        <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">

            {/* Header */}
            <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                <div className="container mx-auto px-6 h-16 flex items-center">
                    <h1 className="text-xl font-semibold tracking-tight">PWA Research Platform</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-16">
                <div className="max-w-4xl mx-auto">

                    {/* Hero Section */}
                    <section className="mb-16 text-center">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-neutral-900 dark:text-neutral-50">
                            Progressive Web Application Research
                        </h2>
                        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                            Explore cutting-edge research and resources on Progressive Web Apps,
                            offline-first architecture, and modern web technologies.
                        </p>
                    </section>

                    {/* Navigation Cards */}
                    <div className="grid md:grid-cols-2 gap-8 mb-16">
                        {sections.map((section) => {
                            const Icon = section.icon
                            return (
                                <Card
                                    key={section.id}
                                    className="group cursor-pointer transition-all duration-300 hover:shadow-lg border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                                    onClick={() => navigate(section.path)}
                                >
                                    <CardHeader className="pb-4">
                                        <div className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                                            <Icon className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
                                        </div>
                                        <CardTitle className="text-2xl font-semibold mb-2">
                                            {section.title}
                                        </CardTitle>
                                        <CardDescription className="text-base leading-relaxed">
                                            {section.description}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="space-y-6">
                                        {/* Features List */}
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                                                Key Features
                                            </p>
                                            <ul className="space-y-2">
                                                {section.features.map((feature, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                                        <span className="w-1 h-1 rounded-full bg-neutral-400 dark:bg-neutral-600 mt-2 shrink-0" />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Action Link */}
                                        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-50 pt-2">
                                            <span>Explore</span>
                                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* Information Section */}
                    <section className="border-t border-neutral-200 dark:border-neutral-800 pt-12">
                        <div className="text-center">
                            <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-4">
                                Technology Stack
                            </h3>
                            <p className="text-neutral-600 dark:text-neutral-400">
                                Built with React, TypeScript, and Progressive Web App technologies
                            </p>
                        </div>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-16 bg-neutral-50 dark:bg-neutral-900/50">
                <div className="container mx-auto px-6 py-8 text-center">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        &copy; 2026 PWA Research Platform. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}

export default HomePage
