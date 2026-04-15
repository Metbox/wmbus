/*
 Diehl Sharky 775 ultrasonic heat meter driver.

 Manufacturer: DME (Diehl Metering, Germany)
 Type: 0x04 (Heat meter), Version: 0x40

 Fields extracted:
   - total_energy_consumption_kwh (instantaneous energy)
   - total_energy_consumption_tariff1_kwh (cooling energy)
   - total_volume_m3 (heating media volume)
   - power_kw (instantaneous power)
   - volume_flow_m3h (instantaneous flow)
   - flow_temperature_c (supply temperature)
   - return_temperature_c (return temperature)
   - temperature_difference_c (supply - return)
   - operating_time_h (total operating hours)
   - target_energy_consumption_kwh (billing period energy, StorageNr 5)
   - target_volume_m3 (billing period volume, StorageNr 5)
   - target_date (billing period end date, StorageNr 5)
*/

#include"meters_common_implementation.h"

namespace
{
    struct Driver : public virtual MeterCommonImplementation
    {
        Driver(MeterInfo &mi, DriverInfo &di);
    };

    static bool ok = staticRegisterDriver([](DriverInfo&di)
    {
        di.setName("sharky775");
        di.setDefaultFields("name,id,total_energy_consumption_kwh,total_volume_m3,"
                            "volume_flow_m3h,power_kw,flow_temperature_c,"
                            "return_temperature_c,temperature_difference_c,timestamp");
        di.setMeterType(MeterType::HeatMeter);
        di.addLinkMode(LinkMode::T1);
        di.addMVT(MANUFACTURER_DME,  0x04,  0x40);
        di.setConstructor([](MeterInfo& mi, DriverInfo& di){ return shared_ptr<Meter>(new Driver(mi, di)); });
    });

    Driver::Driver(MeterInfo &mi, DriverInfo &di) : MeterCommonImplementation(mi, di)
    {
        setMeterType(MeterType::HeatMeter);

        addLinkMode(LinkMode::T1);

        addOptionalLibraryFields("operating_time_h");

        addStringFieldWithExtractorAndLookup(
            "status",
            "Status of meter.",
            DEFAULT_PRINT_PROPERTIES | PrintProperty::STATUS,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::ErrorFlags),
            Translate::Lookup()
            .add(Translate::Rule("ERROR_FLAGS", Translate::MapType::BitToString)
                 .set(MaskBits(0x0000))
                 .set(DefaultMessage("OK"))
                ));

        addNumericFieldWithExtractor(
            "total_energy_consumption",
            "The total heat energy consumption recorded by this meter.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Energy,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::AnyEnergyVIF)
            );

        addNumericFieldWithExtractor(
            "total_energy_consumption_tariff1",
            "The total cooling energy consumption recorded by this meter.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Energy,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::AnyEnergyVIF)
            .set(TariffNr(1))
            );

        addNumericFieldWithExtractor(
            "total_volume",
            "The total heating media volume recorded by this meter.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Volume,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::Volume)
            );

        addNumericFieldWithExtractor(
            "volume_flow",
            "The current heat media volume flow.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Flow,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::VolumeFlow)
            );

        addNumericFieldWithExtractor(
            "power",
            "The current power consumption.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Power,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::PowerW)
            );

        addNumericFieldWithExtractor(
            "flow_temperature",
            "The current supply heat media temperature.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Temperature,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::FlowTemperature)
            );

        addNumericFieldWithExtractor(
            "return_temperature",
            "The current return heat media temperature.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Temperature,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::ReturnTemperature)
            );

        addNumericFieldWithExtractor(
            "temperature_difference",
            "The temperature difference between supply and return.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Temperature,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::TemperatureDifference)
            );

        addNumericFieldWithExtractor(
            "target_energy_consumption",
            "The total energy consumption at the end of the previous billing period.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Energy,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::AnyEnergyVIF)
            .set(StorageNr(5))
            );

        addNumericFieldWithExtractor(
            "target_volume",
            "The total volume at the end of the previous billing period.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::Volume,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::Volume)
            .set(StorageNr(5))
            );

        addNumericFieldWithExtractor(
            "target",
            "The last billing period end date.",
            DEFAULT_PRINT_PROPERTIES,
            Quantity::PointInTime,
            VifScaling::Auto, DifSignedness::Signed,
            FieldMatcher::build()
            .set(MeasurementType::Instantaneous)
            .set(VIFRange::Date)
            .set(StorageNr(5)),
            Unit::DateLT);
    }
}

// Test: Sharky775 sharky775 69130084 51728910e66d83f851728910e66d83f8
// telegram=|5e44a5118400136940047a1c005005108e922dd046fa150bc2cbaefc4565a9d00ec6e948b2659111cf25179bb5e37841b8bec8f8965033e7222832f92d6037cba40acbbfa8e3a122c82a6e9ba3af672a6f9016a964adec9b74de47f8d26c2f|
// {"_":"telegram","media":"heat","meter":"sharky775","name":"Sharky775","id":"69130084","total_energy_consumption_kwh":7831560,"total_energy_consumption_tariff1_kwh":0,"total_volume_m3":1531476.2,"power_kw":227.06,"volume_flow_m3h":4.38,"flow_temperature_c":80.8,"return_temperature_c":35.9,"temperature_difference_c":44.8,"operating_time_h":47595,"target_energy_consumption_kwh":7812400,"target_volume_m3":1524955.2,"target_date":"2026-03-31","timestamp":"1111-11-11T11:11:11Z"}
// |Sharky775;69130084;7831560;1531476.2;4.38;227.06;80.8;35.9;44.8;1111-11-11 11:11.11
