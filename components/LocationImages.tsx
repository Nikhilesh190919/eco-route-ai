"use client";
import Image from "next/image";

export function LocationImages({ origin, destination }: { origin: string; destination: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      <div className="text-center">
        <Image
          src={`https://source.unsplash.com/600x400/?${encodeURIComponent(origin)}`}
          alt={`${origin} landscape`}
          width={600}
          height={400}
          className="rounded-lg shadow-md object-cover"
        />
        <h3 className="text-lg font-semibold mt-2">Origin: {origin}</h3>
      </div>

      <div className="text-center">
        <Image
          src={`https://source.unsplash.com/600x400/?${encodeURIComponent(destination)}`}
          alt={`${destination} landscape`}
          width={600}
          height={400}
          className="rounded-lg shadow-md object-cover"
        />
        <h3 className="text-lg font-semibold mt-2">Destination: {destination}</h3>
      </div>
    </div>
  );
}


