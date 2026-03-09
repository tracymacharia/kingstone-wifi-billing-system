
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KingstoneIcon } from "@/components/ui/Kingstone-icon";
import { Shield, CreditCard, Users, BarChart3, Settings, ArrowRight, Play } from "lucide-react";
import { Hero3DBackground } from "@/components/ui/hero-3d-background";
import { FloatingElements } from "@/components/ui/floating-elements";

const Index = () => {
  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* 3D Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950/50 to-purple-950/30">
        <Hero3DBackground />
      </div>
      
      {/* Floating Elements */}
      <FloatingElements />
      
      {/* Header */}
      <header className="relative z-20 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 transition-transform group-hover:scale-110">
                <KingstoneIcon className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                Kingstone
              </h1>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline" size="sm" className="border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm">
                <Link to="/owner/register" className="flex items-center gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm">
                <Link to="/owner">Owner Login</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm">
                <Link to="/admin">Admin Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-6xl mx-auto">
            <div className="animate-fade-in animation-delay-200">
              <h2 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
                <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  Enterprise
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Wi-Fi Billing
                </span>
                <br />
                <span className="bg-gradient-to-r from-accent via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Platform
                </span>
              </h2>
            </div>
            
            <div className="animate-slide-up animation-delay-400">
              <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
                Revolutionary billing and management system for Wi-Fi service providers in Kenya. 
                <br className="hidden md:block" />
                Seamlessly integrate <span className="text-green-400 font-semibold">MPESA payments</span>, manage <span className="text-blue-400 font-semibold">Mikrotik devices</span>, and scale your operations.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in animation-delay-600">
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg shadow-primary/25 text-lg px-8 py-4 h-auto group w-full sm:w-auto">
                <Link to="/owner/register" className="flex items-center gap-3">
                  <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  Start Your Journey
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm text-lg px-8 py-4 h-auto w-full sm:w-auto">
                <Link to="#features" className="flex items-center gap-2">
                  Explore Features
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
            
            {/* Stats Section */}
            <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-fade-in animation-delay-800">
              <div className="text-center p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
                <div className="text-gray-300">Uptime Guarantee</div>
              </div>
              <div className="text-center p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-3xl font-bold text-secondary mb-2">24/7</div>
                <div className="text-gray-300">System Monitoring</div>
              </div>
              <div className="text-center p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-3xl font-bold text-accent mb-2">Instant</div>
                <div className="text-gray-300">MPESA Integration</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-20 animate-fade-in">
            <h3 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Complete Wi-Fi Business Solution
            </h3>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Everything you need to run a successful Wi-Fi business in Kenya with cutting-edge technology
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <Card className="group border border-white/10 bg-black/20 backdrop-blur-md hover:bg-black/30 transition-all duration-500 hover:scale-105 hover:border-primary/50 animate-fade-in">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="w-8 h-8 text-green-400" />
                </div>
                <CardTitle className="text-xl text-white group-hover:text-green-400 transition-colors">MPESA Integration</CardTitle>
                <CardDescription className="text-gray-300">
                  Seamless payment processing with Till and Paybill support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    Automatic payment verification
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    Real-time transaction logging
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    Multiple payment methods
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group border border-white/10 bg-black/20 backdrop-blur-md hover:bg-black/30 transition-all duration-500 hover:scale-105 hover:border-secondary/50 animate-fade-in animation-delay-200">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-8 h-8 text-blue-400" />
                </div>
                <CardTitle className="text-xl text-white group-hover:text-blue-400 transition-colors">Mikrotik Control</CardTitle>
                <CardDescription className="text-gray-300">
                  Complete integration with RouterOS for access management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    Hotspot management
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    PPPoE configuration
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    Static IP assignments
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group border border-white/10 bg-black/20 backdrop-blur-md hover:bg-black/30 transition-all duration-500 hover:scale-105 hover:border-accent/50 animate-fade-in animation-delay-400">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-purple-600/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
                <CardTitle className="text-xl text-white group-hover:text-purple-400 transition-colors">Multi-Admin Support</CardTitle>
                <CardDescription className="text-gray-300">
                  Manage multiple administrators and locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    Custom admin URLs
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    Role-based access control
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    Individual admin analytics
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group border border-white/10 bg-black/20 backdrop-blur-md hover:bg-black/30 transition-all duration-500 hover:scale-105 hover:border-primary/50 animate-fade-in animation-delay-600">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-8 h-8 text-orange-400" />
                </div>
                <CardTitle className="text-xl text-white group-hover:text-orange-400 transition-colors">Analytics & Reporting</CardTitle>
                <CardDescription className="text-gray-300">
                  Comprehensive insights into your business performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                    Revenue tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                    User activity monitoring
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                    System health reports
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group border border-white/10 bg-black/20 backdrop-blur-md hover:bg-black/30 transition-all duration-500 hover:scale-105 hover:border-secondary/50 animate-fade-in animation-delay-800">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-cyan-600/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <KingstoneIcon className="w-8 h-8" />
                </div>
                <CardTitle className="text-xl text-white group-hover:text-cyan-400 transition-colors">Package Management</CardTitle>
                <CardDescription className="text-gray-300">
                  Flexible pricing and package configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                    Custom time packages
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                    Bandwidth limitations
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                    Automatic expiry handling
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group border border-white/10 bg-black/20 backdrop-blur-md hover:bg-black/30 transition-all duration-500 hover:scale-105 hover:border-accent/50 animate-fade-in animation-delay-1000">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500/20 to-pink-600/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Settings className="w-8 h-8 text-pink-400" />
                </div>
                <CardTitle className="text-xl text-white group-hover:text-pink-400 transition-colors">Easy Setup</CardTitle>
                <CardDescription className="text-gray-300">
                  Quick deployment with minimal configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
                    One-click Mikrotik setup
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
                    Automated configuration
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
                    24/7 system monitoring
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-md py-16">
        <div className="container mx-auto px-4">
          <div className="text-center animate-fade-in">
            <div className="flex items-center justify-center space-x-3 mb-6 group">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform">
                <KingstoneIcon className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                Kingstone
              </h1>
            </div>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Empowering Wi-Fi businesses across Kenya with intelligent billing solutions and cutting-edge technology
            </p>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto mb-8"></div>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Kingstone - Enterprise Wi-Fi Billing Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
