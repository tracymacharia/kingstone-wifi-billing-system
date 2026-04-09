import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface LocationViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: string;
  mikrotikName: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const LocationViewer = ({ open, onOpenChange, location, mikrotikName }: LocationViewerProps) => {
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [mapUrl, setMapUrl] = useState<string>("");
  const [directionsUrl, setDirectionsUrl] = useState<string>("");

  // Get current location
  const getCurrentLocation = (): Promise<Coordinates | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          resolve(null);
        },
        { timeout: 10000 }
      );
    });
  };

  useEffect(() => {
    if (open && location) {
      loadMapData();
    }
  }, [open, location]);

  const loadMapData = async () => {
    setLoading(true);
    try {
      // Create Google Maps embed URL with location search
      // Google Maps can handle location names directly
      const encodedLocation = encodeURIComponent(location);
      const embedUrl = `https://maps.google.com/maps?q=${encodedLocation}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
      setMapUrl(embedUrl);
      
      // Get current location for directions
      const currentCoords = await getCurrentLocation();
      if (currentCoords) {
        setCurrentLocation(currentCoords);
        const directions = `https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${encodedLocation}&travelmode=driving`;
        setDirectionsUrl(directions);
      } else {
        const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}&travelmode=driving`;
        setDirectionsUrl(directions);
      }
    } catch (error) {
      logger.error('Error loading map data:', error);
      toast.error('Failed to load map');
    } finally {
      setLoading(false);
    }
  };

  const handleGetDirections = () => {
    if (directionsUrl) {
      window.open(directionsUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <DialogTitle>{mikrotikName} - Location</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription className="text-left">
            {location}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Map Embed */}
              <div className="rounded-lg overflow-hidden border bg-muted h-64 md:h-96">
                {mapUrl ? (
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    title="Location Map"
                    className="w-full h-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Map not available</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={handleGetDirections}
                  className="w-full h-auto py-3 bg-primary hover:bg-primary/90"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Get Directions</div>
                    <div className="text-xs text-muted-foreground">Navigate from your location</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const encodedLoc = encodeURIComponent(location);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLoc}`, '_blank');
                  }}
                  className="w-full h-auto py-3"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Open in Google Maps</div>
                    <div className="text-xs text-muted-foreground">View in full screen</div>
                  </div>
                </Button>
              </div>

              {/* Manual Location Input */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Location Search</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Search for this location in Google Maps:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={location}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const encodedLoc = encodeURIComponent(location);
                      window.open(`https://www.google.com/maps/search/${encodedLoc}`, '_blank');
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Search
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationViewer;
