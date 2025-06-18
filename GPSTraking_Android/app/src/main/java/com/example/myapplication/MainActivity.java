package com.example.myapplication;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.ActivityRecognition;
import com.google.android.gms.location.ActivityRecognitionClient;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.material.floatingactionbutton.FloatingActionButton;

import org.osmdroid.api.IMapController;
import org.osmdroid.config.Configuration;
import org.osmdroid.tileprovider.tilesource.TileSourceFactory;
import org.osmdroid.util.GeoPoint;
import org.osmdroid.views.MapView;
import org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider;
import org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay;

public class MainActivity extends AppCompatActivity {

    private MapView mapView;
    private MyLocationNewOverlay locationOverlay;
    private FloatingActionButton btnRecenter;
    private TextView locationInfoText;

    private FusedLocationProviderClient fusedLocationClient;
    private ActivityRecognitionClient activityRecognitionClient;

    private GeoPoint currentLocation;
    private String currentActivity = "Unknown";
    private String deviceId;

    private final ActivityResultLauncher<String[]> locationPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), result -> {
                boolean fineLocationGranted = result.getOrDefault(Manifest.permission.ACCESS_FINE_LOCATION, false);
                boolean coarseLocationGranted = result.getOrDefault(Manifest.permission.ACCESS_COARSE_LOCATION, false);
                boolean activityRecognitionGranted = result.getOrDefault(Manifest.permission.ACTIVITY_RECOGNITION, false);

                if (fineLocationGranted || coarseLocationGranted) {
                    startLocationUpdates();
                    setupLocationOverlay();
                    if (activityRecognitionGranted) {
                        startActivityRecognition();
                    }
                } else {
                    Toast.makeText(this, "Location permission is required.", Toast.LENGTH_LONG).show();
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Configuration.getInstance().load(getApplicationContext(), getSharedPreferences("osmdroid", MODE_PRIVATE));
        setContentView(R.layout.activity_main);

        mapView = findViewById(R.id.map);
        btnRecenter = findViewById(R.id.btnRecenter);
        locationInfoText = findViewById(R.id.locationInfoText);

        mapView.setTileSource(TileSourceFactory.MAPNIK);
        mapView.setMultiTouchControls(true);

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        activityRecognitionClient = ActivityRecognition.getClient(this);

        deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        locationInfoText.setText("Device ID: " + deviceId + "\nWaiting for location...");

        btnRecenter.setOnClickListener(v -> {
            if (currentLocation != null) {
                IMapController mapController = mapView.getController();
                mapController.animateTo(currentLocation);
                mapController.setZoom(18.0);
            }
        });

        checkPermissionsAndStart();
    }

    private void checkPermissionsAndStart() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            startLocationUpdates();
            setupLocationOverlay();

            // Check activity recognition permission separately (for Android 10+)
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED) {
                startActivityRecognition();
            }
        } else {
            locationPermissionLauncher.launch(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.ACTIVITY_RECOGNITION
            });
        }
    }

    @SuppressLint("MissingPermission")
    private void setupLocationOverlay() {
        locationOverlay = new MyLocationNewOverlay(new GpsMyLocationProvider(this), mapView);
        locationOverlay.enableMyLocation();
        locationOverlay.runOnFirstFix(() -> {
            currentLocation = locationOverlay.getMyLocation();
            if (currentLocation != null) {
                runOnUiThread(() -> {
                    IMapController mapController = mapView.getController();
                    mapController.setZoom(18.0);
                    mapController.animateTo(currentLocation);
                });
            }
        });

        mapView.getOverlays().add(locationOverlay);
        mapView.invalidate();
    }

    @SuppressLint("MissingPermission")
    private void startLocationUpdates() {
        LocationRequest.Builder builder = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000);
        builder.setMinUpdateIntervalMillis(2000);
        LocationRequest request = builder.build();

        fusedLocationClient.requestLocationUpdates(request, new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;
                Location location = locationResult.getLastLocation();
                if (location != null) {
                    updateLocationInfo(location);
                }
            }
        }, getMainLooper());
    }

    private void updateLocationInfo(Location location) {
        currentLocation = new GeoPoint(location.getLatitude(), location.getLongitude());
        double speed = location.getSpeed(); // m/s

        String info = String.format(
                "Device ID: %s\nLat: %.5f, Lon: %.5f\nSpeed: %.1f m/s\nActivity: %s",
                deviceId,
                location.getLatitude(),
                location.getLongitude(),
                speed,
                currentActivity
        );

        locationInfoText.setText(info);
    }

    @SuppressLint("MissingPermission")
    private void startActivityRecognition() {
        Intent intent = new Intent(this, ActivityReceiver.class);
        intent.setPackage(getPackageName());
        PendingIntent pendingIntent = PendingIntent.getBroadcast(this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        activityRecognitionClient.requestActivityUpdates(5000, pendingIntent)
                .addOnSuccessListener(unused -> Toast.makeText(this, "Activity updates started", Toast.LENGTH_SHORT).show())
                .addOnFailureListener(e -> Toast.makeText(this, "Activity updates failed: " + e.getMessage(), Toast.LENGTH_SHORT).show());
    }

    public void updateActivity(String activityLabel) {
        this.currentActivity = activityLabel;
        // Update the UI with the new activity
        if (currentLocation != null) {
            String info = String.format(
                    "Device ID: %s\nLat: %.5f, Lon: %.5f\nActivity: %s",
                    deviceId,
                    currentLocation.getLatitude(),
                    currentLocation.getLongitude(),
                    currentActivity
            );
            locationInfoText.setText(info);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        mapView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        mapView.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // Clean up location updates to prevent memory leaks
        if (fusedLocationClient != null) {
            fusedLocationClient.removeLocationUpdates(new LocationCallback() {});
        }
    }
}