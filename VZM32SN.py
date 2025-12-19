"""VZM32-SN MMwave Switch/Dimmer Module with explicit entity declarations."""
import logging
from typing import Any, Optional, Union

from zigpy.profiles import zha
from zigpy.quirks import CustomCluster
from zigpy.quirks.v2 import QuirkBuilder
from zigpy.quirks.v2.homeassistant import EntityType
import zigpy.types as t
from zigpy.zcl.foundation import (
    BaseAttributeDefs,
    BaseCommandDefs,
    ZCLAttributeDef,
    ZCLCommandDef,
    ZCLHeader,
)

from zhaquirks.const import (
    BUTTON,
    BUTTON_1,
    BUTTON_2,
    BUTTON_3,
    BUTTON_4,
    BUTTON_5,
    BUTTON_6,
    COMMAND,
    COMMAND_DOUBLE,
    COMMAND_HOLD,
    COMMAND_ID,
    COMMAND_PRESS,
    COMMAND_QUAD,
    COMMAND_RELEASE,
    COMMAND_TRIPLE,
    DOUBLE_PRESS,
    PRESS_TYPE,
    QUADRUPLE_PRESS,
    QUINTUPLE_PRESS,
    TRIPLE_PRESS,
    ZHA_SEND_EVENT,
)

_LOGGER = logging.getLogger(__name__)

# Cluster IDs
VZM32SN_CLUSTER_ID = 0xFC31
MMWAVE_CLUSTER_ID = 0xFC32

# Press Types
COMMAND_QUINTUPLE = "quintuple"
PRESS_TYPES = {
    0: COMMAND_PRESS,
    1: COMMAND_RELEASE,
    2: COMMAND_HOLD,
    3: COMMAND_DOUBLE,
    4: COMMAND_TRIPLE,
    5: COMMAND_QUAD,
    6: COMMAND_QUINTUPLE,
}

LED_NOTIFICATION_TYPES = {
    0: "LED_1",
    1: "LED_2",
    2: "LED_3",
    3: "LED_4",
    4: "LED_5",
    5: "LED_6",
    6: "LED_7",
    16: "ALL_LEDS",
    255: "CONFIG_BUTTON_DOUBLE_PRESS",
}

BUTTONS = {1: BUTTON_1, 2: BUTTON_2, 3: BUTTON_3, 4: BUTTON_4, 5: BUTTON_5, 6: BUTTON_6}
ON = "Up"
OFF = "Down"
CONFIG = "Config"
AUX_ON = "Aux up"
AUX_OFF = "Aux down"
AUX_CONFIG = "Aux config"

NOTIFICATION_TYPE = "notification_type"


class InovelliCluster(CustomCluster):
    """Inovelli base cluster."""

    cluster_id = 0xFC31
    ep_attribute = "inovelli_vzm31sn_cluster"

    class AttributeDefs(BaseAttributeDefs):
        """Attribute definitions."""

        dimming_speed_up_remote = ZCLAttributeDef(
            id=0x0001,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        ramp_rate_off_to_on_remote = ZCLAttributeDef(
            id=0x0003,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        dimming_speed_down_remote = ZCLAttributeDef(
            id=0x0005,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        ramp_rate_on_to_off_remote = ZCLAttributeDef(
            id=0x0007,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        minimum_level = ZCLAttributeDef(
            id=0x0009,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        maximum_level = ZCLAttributeDef(
            id=0x000A,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        auto_off_timer = ZCLAttributeDef(
            id=0x000C,
            type=t.uint16_t,
            is_manufacturer_specific=True,
        )
        default_level_remote = ZCLAttributeDef(
            id=0x000E,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        state_after_power_restored = ZCLAttributeDef(
            id=0x000F,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        power_type = ZCLAttributeDef(
            id=0x0015,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        internal_temp_monitor = ZCLAttributeDef(
            id=0x0020,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        overheated = ZCLAttributeDef(
            id=0x0021,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        smart_bulb_mode = ZCLAttributeDef(
            id=0x0034,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        led_color_when_on = ZCLAttributeDef(
            id=0x005F,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        led_intensity_when_on = ZCLAttributeDef(
            id=0x0061,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        remote_protection = ZCLAttributeDef(
            id=0x0101,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        output_mode = ZCLAttributeDef(
            id=0x0102,
            type=t.Bool,
            is_manufacturer_specific=True,
        )

    class ServerCommandDefs(BaseCommandDefs):
        """Server command definitions."""

        button_event = ZCLCommandDef(
            id=0x00,
            schema={"button_pressed": t.uint8_t, "press_type": t.uint8_t},
            is_manufacturer_specific=True,
        )
        led_effect = ZCLCommandDef(
            id=0x01,
            schema={
                "led_effect": t.uint8_t,
                "led_color": t.uint8_t,
                "led_level": t.uint8_t,
                "led_duration": t.uint8_t,
            },
            is_manufacturer_specific=True,
        )
        reset_energy_meter = ZCLCommandDef(
            id=0x02,
            schema={},
            is_manufacturer_specific=True,
        )
        individual_led_effect = ZCLCommandDef(
            id=0x03,
            schema={
                "led_number": t.uint8_t,
                "led_effect": t.uint8_t,
                "led_color": t.uint8_t,
                "led_level": t.uint8_t,
                "led_duration": t.uint8_t,
            },
            is_manufacturer_specific=True,
        )
        led_effect_complete = ZCLCommandDef(
            id=0x24,
            schema={
                "notification_type": t.uint8_t,
            },
            is_manufacturer_specific=True,
        )

    def handle_cluster_request(
        self,
        hdr: ZCLHeader,
        args: list[Any],
        *,
        dst_addressing: Optional[
            Union[t.Addressing.Group, t.Addressing.IEEE, t.Addressing.NWK]
        ] = None,
    ):
        """Handle a cluster request."""
        _LOGGER.debug(
            "%s: handle_cluster_request - Command: %s Data: %s",
            self.name,
            hdr.command_id,
            args,
        )
        if hdr.command_id == self.ServerCommandDefs.button_event.id:
            button = BUTTONS[args.button_pressed]
            press_type = PRESS_TYPES[args.press_type]
            action = f"{button}_{press_type}"
            event_args = {
                BUTTON: button,
                PRESS_TYPE: press_type,
                COMMAND_ID: hdr.command_id,
            }
            self.listener_event(ZHA_SEND_EVENT, action, event_args)
            return
        if hdr.command_id == self.ServerCommandDefs.led_effect_complete.id:
            notification_type = LED_NOTIFICATION_TYPES.get(
                args.notification_type, "unknown"
            )
            action = f"led_effect_complete_{notification_type}"
            event_args = {
                NOTIFICATION_TYPE: notification_type,
                COMMAND_ID: hdr.command_id,
            }
            self.listener_event(ZHA_SEND_EVENT, action, event_args)
            return


class InovelliVZM32SNCluster(InovelliCluster):
    """Inovelli VZM32-SN custom cluster."""

    name = "InovelliVZM32SNCluster"

    class AttributeDefs(InovelliCluster.AttributeDefs):
        """Attribute definitions."""

        dimming_speed_up_local = ZCLAttributeDef(
            id=0x0002,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        ramp_rate_off_to_on_local = ZCLAttributeDef(
            id=0x0004,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        dimming_speed_down_local = ZCLAttributeDef(
            id=0x0006,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        ramp_rate_on_to_off_local = ZCLAttributeDef(
            id=0x0008,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        invert_switch = ZCLAttributeDef(
            id=0x000B,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        default_level_local = ZCLAttributeDef(
            id=0x000D,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        load_level_indicator_timeout = ZCLAttributeDef(
            id=0x0011,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        active_power_reports = ZCLAttributeDef(
            id=0x0012,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        periodic_power_and_energy_reports = ZCLAttributeDef(
            id=0x0013,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        active_energy_reports = ZCLAttributeDef(
            id=0x0014,
            type=t.uint16_t,
            is_manufacturer_specific=True,
        )
        switch_type = ZCLAttributeDef(
            id=0x0016,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        increased_non_neutral_output = ZCLAttributeDef(
            id=0x0019,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        leading_or_trailing_edge = ZCLAttributeDef(
            id=0x001A,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        button_delay = ZCLAttributeDef(
            id=0x0032,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        device_bind_number = ZCLAttributeDef(
            id=0x0033,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        double_tap_up_enabled = ZCLAttributeDef(
            id=0x0035,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        double_tap_down_enabled = ZCLAttributeDef(
            id=0x0036,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        double_tap_up_level = ZCLAttributeDef(
            id=0x0037,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        double_tap_down_level = ZCLAttributeDef(
            id=0x0038,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led1_strip_color_when_on = ZCLAttributeDef(
            id=0x003C,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led1_strip_color_when_off = ZCLAttributeDef(
            id=0x003D,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led1_strip_intensity_when_on = ZCLAttributeDef(
            id=0x003E,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led1_strip_intensity_when_off = ZCLAttributeDef(
            id=0x003F,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led2_strip_color_when_on = ZCLAttributeDef(
            id=0x0041,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led2_strip_color_when_off = ZCLAttributeDef(
            id=0x0042,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led2_strip_intensity_when_on = ZCLAttributeDef(
            id=0x0043,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led2_strip_intensity_when_off = ZCLAttributeDef(
            id=0x0044,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led3_strip_color_when_on = ZCLAttributeDef(
            id=0x0046,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led3_strip_color_when_off = ZCLAttributeDef(
            id=0x0047,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led3_strip_intensity_when_on = ZCLAttributeDef(
            id=0x0048,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led3_strip_intensity_when_off = ZCLAttributeDef(
            id=0x0049,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led4_strip_color_when_on = ZCLAttributeDef(
            id=0x004B,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led4_strip_color_when_off = ZCLAttributeDef(
            id=0x004C,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led4_strip_intensity_when_on = ZCLAttributeDef(
            id=0x004D,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led4_strip_intensity_when_off = ZCLAttributeDef(
            id=0x004E,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led5_strip_color_when_on = ZCLAttributeDef(
            id=0x0050,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led5_strip_color_when_off = ZCLAttributeDef(
            id=0x0051,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led5_strip_intensity_when_on = ZCLAttributeDef(
            id=0x0052,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led5_strip_intensity_when_off = ZCLAttributeDef(
            id=0x0053,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led6_strip_color_when_on = ZCLAttributeDef(
            id=0x0055,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led6_strip_color_when_off = ZCLAttributeDef(
            id=0x0056,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led6_strip_intensity_when_on = ZCLAttributeDef(
            id=0x0057,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led6_strip_intensity_when_off = ZCLAttributeDef(
            id=0x0058,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led7_strip_color_when_on = ZCLAttributeDef(
            id=0x005A,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led7_strip_color_when_off = ZCLAttributeDef(
            id=0x005B,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led7_strip_intensity_when_on = ZCLAttributeDef(
            id=0x005C,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        default_led7_strip_intensity_when_off = ZCLAttributeDef(
            id=0x005D,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        led_color_when_off = ZCLAttributeDef(
            id=0x0060,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        led_intensity_when_off = ZCLAttributeDef(
            id=0x0062,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        led_scaling_mode = ZCLAttributeDef(
            id=0x0064,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        light_on_presence_behavior = ZCLAttributeDef(
            id=0x006E,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        mmwave_room_size_preset = ZCLAttributeDef(
            id=0x0075,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        fan_single_tap_behavior = ZCLAttributeDef(
            id=0x0078,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        fan_timer_display = ZCLAttributeDef(
            id=0x0079,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        aux_switch_scenes = ZCLAttributeDef(
            id=0x007B,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        binding_off_to_on_sync_level = ZCLAttributeDef(
            id=0x007D,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        fan_module_binding_control = ZCLAttributeDef(
            id=0x0082,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        low_for_bound_control = ZCLAttributeDef(
            id=0x0083,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        medium_for_bound_control = ZCLAttributeDef(
            id=0x0084,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        high_for_bound_control = ZCLAttributeDef(
            id=0x0085,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        led_color_for_bound_control = ZCLAttributeDef(
            id=0x0086,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        local_protection = ZCLAttributeDef(
            id=0x0100,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        on_off_led_mode = ZCLAttributeDef(
            id=0x0103,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        firmware_progress_led = ZCLAttributeDef(
            id=0x0104,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        relay_click_in_on_off_mode = ZCLAttributeDef(
            id=0x0105,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        disable_clear_notifications_double_tap = ZCLAttributeDef(
            id=0x0106,
            type=t.Bool,
            is_manufacturer_specific=True,
        )


class InovelliVZM32SNMMWaveCluster(CustomCluster):
    """Inovelli VZM32-SN MMWave custom cluster."""

    cluster_id = 0xFC32
    ep_attribute = "inovelli_vzm32snmmwave_cluster"

    class AttributeDefs(BaseAttributeDefs):
        """Attribute definitions."""

        mmwave_z_min = ZCLAttributeDef(
            id=0x0065,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_z_max = ZCLAttributeDef(
            id=0x0066,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_x_min = ZCLAttributeDef(
            id=0x0067,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_x_max = ZCLAttributeDef(
            id=0x0068,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_y_min = ZCLAttributeDef(
            id=0x0069,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_y_max = ZCLAttributeDef(
            id=0x006A,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_info_report = ZCLAttributeDef(
            id=0x006B,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        mmwave_stay_life = ZCLAttributeDef(
            id=0x006C,
            type=t.uint32_t,
            is_manufacturer_specific=True,
        )
        mmwave_detect_sensitivity = ZCLAttributeDef(
            id=0x0070,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        mmwave_detect_trigger = ZCLAttributeDef(
            id=0x0071,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )
        mmwave_hold_time = ZCLAttributeDef(
            id=0x0072,
            type=t.uint32_t,
            is_manufacturer_specific=True,
        )
        mmwave_version = ZCLAttributeDef(
            id=0x0073,
            type=t.uint32_t,
            is_manufacturer_specific=True,
        )
        # Target tracking attributes (virtual - updated from command 0x01)
        # Target 1
        mmwave_target_1_x = ZCLAttributeDef(
            id=0x0080,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_1_y = ZCLAttributeDef(
            id=0x0081,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_1_z = ZCLAttributeDef(
            id=0x0082,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_1_speed = ZCLAttributeDef(
            id=0x0083,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_1_active = ZCLAttributeDef(
            id=0x0084,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        # Target 2
        mmwave_target_2_x = ZCLAttributeDef(
            id=0x0085,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_2_y = ZCLAttributeDef(
            id=0x0086,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_2_z = ZCLAttributeDef(
            id=0x0087,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_2_speed = ZCLAttributeDef(
            id=0x0088,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_2_active = ZCLAttributeDef(
            id=0x0089,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        # Target 3
        mmwave_target_3_x = ZCLAttributeDef(
            id=0x008A,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_3_y = ZCLAttributeDef(
            id=0x008B,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_3_z = ZCLAttributeDef(
            id=0x008C,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_3_speed = ZCLAttributeDef(
            id=0x008D,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_3_active = ZCLAttributeDef(
            id=0x008E,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        # Target 4
        mmwave_target_4_x = ZCLAttributeDef(
            id=0x008F,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_4_y = ZCLAttributeDef(
            id=0x0090,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_4_z = ZCLAttributeDef(
            id=0x0091,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_4_speed = ZCLAttributeDef(
            id=0x0092,
            type=t.int16s,
            is_manufacturer_specific=True,
        )
        mmwave_target_4_active = ZCLAttributeDef(
            id=0x0093,
            type=t.Bool,
            is_manufacturer_specific=True,
        )
        # Number of active targets
        mmwave_target_count = ZCLAttributeDef(
            id=0x0094,
            type=t.uint8_t,
            is_manufacturer_specific=True,
        )

    class ServerCommandDefs(BaseCommandDefs):
        """Server command definitions."""

        mmwave_presence_report = ZCLCommandDef(
            id=0x00,
            schema={
                "area_status": t.uint8_t,  # Bitmask of presence in sub-areas
            },
            is_manufacturer_specific=True,
        )
        mmwave_target_report = ZCLCommandDef(
            id=0x01,
            schema={
                "target_count": t.uint8_t,
                "target_id": t.uint8_t,
                "x": t.int16s,
                "y": t.int16s,
                "z": t.int16s,
                "speed": t.int16s,
            },
            is_manufacturer_specific=True,
        )

    def handle_cluster_request(
        self,
        hdr: ZCLHeader,
        args: list[Any],
        *,
        dst_addressing: Optional[
            Union[t.Addressing.Group, t.Addressing.IEEE, t.Addressing.NWK]
        ] = None,
    ):
        """Handle a cluster request."""
        _LOGGER.debug(
            "%s: handle_cluster_request - Command: %s Data: %s",
            self.name,
            hdr.command_id,
            args,
        )

        if hdr.command_id == self.ServerCommandDefs.mmwave_target_report.id:
            # Update target tracking attributes from the report
            target_count = getattr(args, 'target_count', 0)
            target_id = getattr(args, 'target_id', 0)
            x = getattr(args, 'x', 0)
            y = getattr(args, 'y', 0)
            z = getattr(args, 'z', 0)
            speed = getattr(args, 'speed', 0)

            _LOGGER.info(
                "mmWave Target Report: count=%d, id=%d, x=%d, y=%d, z=%d, speed=%d",
                target_count, target_id, x, y, z, speed
            )

            # Update the appropriate target attributes based on target_id (1-4)
            if 1 <= target_id <= 4:
                # Map target_id to attribute names
                attr_prefix = f"mmwave_target_{target_id}"

                # Update the virtual attributes
                self._attr_cache[getattr(self.AttributeDefs, f"{attr_prefix}_x").id] = x
                self._attr_cache[getattr(self.AttributeDefs, f"{attr_prefix}_y").id] = y
                self._attr_cache[getattr(self.AttributeDefs, f"{attr_prefix}_z").id] = z
                self._attr_cache[getattr(self.AttributeDefs, f"{attr_prefix}_speed").id] = speed
                self._attr_cache[getattr(self.AttributeDefs, f"{attr_prefix}_active").id] = True

                # Update target count
                self._attr_cache[self.AttributeDefs.mmwave_target_count.id] = target_count

                # Mark targets beyond count as inactive
                for i in range(1, 5):
                    if i > target_count:
                        inactive_attr = getattr(self.AttributeDefs, f"mmwave_target_{i}_active")
                        self._attr_cache[inactive_attr.id] = False

                # Notify listeners of attribute updates
                self.listener_event("attribute_updated", self.AttributeDefs.mmwave_target_count.id, target_count)

            # Emit event for real-time tracking
            event_args = {
                "target_count": target_count,
                "target_id": target_id,
                "x": x,
                "y": y,
                "z": z,
                "speed": speed,
            }
            self.listener_event(ZHA_SEND_EVENT, "mmwave_target_report", event_args)
            return

        if hdr.command_id == self.ServerCommandDefs.mmwave_presence_report.id:
            area_status = getattr(args, 'area_status', 0)
            _LOGGER.debug("mmWave Presence Report: area_status=%d", area_status)
            event_args = {"area_status": area_status}
            self.listener_event(ZHA_SEND_EVENT, "mmwave_presence_report", event_args)
            return


INOVELLI_AUTOMATION_TRIGGERS = {
    (COMMAND_PRESS, ON): {COMMAND: f"{BUTTON_2}_{COMMAND_PRESS}"},
    (COMMAND_PRESS, OFF): {COMMAND: f"{BUTTON_1}_{COMMAND_PRESS}"},
    (COMMAND_PRESS, CONFIG): {COMMAND: f"{BUTTON_3}_{COMMAND_PRESS}"},
    (COMMAND_PRESS, AUX_ON): {COMMAND: f"{BUTTON_5}_{COMMAND_PRESS}"},
    (COMMAND_PRESS, AUX_OFF): {COMMAND: f"{BUTTON_4}_{COMMAND_PRESS}"},
    (COMMAND_PRESS, AUX_CONFIG): {COMMAND: f"{BUTTON_6}_{COMMAND_PRESS}"},
    (COMMAND_HOLD, ON): {COMMAND: f"{BUTTON_2}_{COMMAND_HOLD}"},
    (COMMAND_HOLD, OFF): {COMMAND: f"{BUTTON_1}_{COMMAND_HOLD}"},
    (COMMAND_HOLD, CONFIG): {COMMAND: f"{BUTTON_3}_{COMMAND_HOLD}"},
    (COMMAND_HOLD, AUX_ON): {COMMAND: f"{BUTTON_5}_{COMMAND_HOLD}"},
    (COMMAND_HOLD, AUX_OFF): {COMMAND: f"{BUTTON_4}_{COMMAND_HOLD}"},
    (COMMAND_HOLD, AUX_CONFIG): {COMMAND: f"{BUTTON_6}_{COMMAND_HOLD}"},
    (DOUBLE_PRESS, ON): {COMMAND: f"{BUTTON_2}_{COMMAND_DOUBLE}"},
    (DOUBLE_PRESS, CONFIG): {COMMAND: f"{BUTTON_3}_{COMMAND_DOUBLE}"},
    (DOUBLE_PRESS, OFF): {COMMAND: f"{BUTTON_1}_{COMMAND_DOUBLE}"},
    (DOUBLE_PRESS, AUX_ON): {COMMAND: f"{BUTTON_5}_{COMMAND_DOUBLE}"},
    (DOUBLE_PRESS, AUX_CONFIG): {COMMAND: f"{BUTTON_6}_{COMMAND_DOUBLE}"},
    (DOUBLE_PRESS, AUX_OFF): {COMMAND: f"{BUTTON_4}_{COMMAND_DOUBLE}"},
    (TRIPLE_PRESS, ON): {COMMAND: f"{BUTTON_2}_{COMMAND_TRIPLE}"},
    (TRIPLE_PRESS, CONFIG): {COMMAND: f"{BUTTON_3}_{COMMAND_TRIPLE}"},
    (TRIPLE_PRESS, OFF): {COMMAND: f"{BUTTON_1}_{COMMAND_TRIPLE}"},
    (TRIPLE_PRESS, AUX_ON): {COMMAND: f"{BUTTON_5}_{COMMAND_TRIPLE}"},
    (TRIPLE_PRESS, AUX_CONFIG): {COMMAND: f"{BUTTON_6}_{COMMAND_TRIPLE}"},
    (TRIPLE_PRESS, AUX_OFF): {COMMAND: f"{BUTTON_4}_{COMMAND_TRIPLE}"},
    (QUADRUPLE_PRESS, ON): {COMMAND: f"{BUTTON_2}_{COMMAND_QUAD}"},
    (QUADRUPLE_PRESS, CONFIG): {COMMAND: f"{BUTTON_3}_{COMMAND_QUAD}"},
    (QUADRUPLE_PRESS, OFF): {COMMAND: f"{BUTTON_1}_{COMMAND_QUAD}"},
    (QUADRUPLE_PRESS, AUX_ON): {COMMAND: f"{BUTTON_5}_{COMMAND_QUAD}"},
    (QUADRUPLE_PRESS, AUX_CONFIG): {COMMAND: f"{BUTTON_6}_{COMMAND_QUAD}"},
    (QUADRUPLE_PRESS, AUX_OFF): {COMMAND: f"{BUTTON_4}_{COMMAND_QUAD}"},
    (QUINTUPLE_PRESS, ON): {COMMAND: f"{BUTTON_2}_{COMMAND_QUINTUPLE}"},
    (QUINTUPLE_PRESS, OFF): {COMMAND: f"{BUTTON_1}_{COMMAND_QUINTUPLE}"},
    (QUINTUPLE_PRESS, CONFIG): {COMMAND: f"{BUTTON_3}_{COMMAND_QUINTUPLE}"},
    (QUINTUPLE_PRESS, AUX_ON): {COMMAND: f"{BUTTON_5}_{COMMAND_QUINTUPLE}"},
    (QUINTUPLE_PRESS, AUX_OFF): {COMMAND: f"{BUTTON_4}_{COMMAND_QUINTUPLE}"},
    (QUINTUPLE_PRESS, AUX_CONFIG): {COMMAND: f"{BUTTON_6}_{COMMAND_QUINTUPLE}"},
    (COMMAND_RELEASE, ON): {COMMAND: f"{BUTTON_2}_{COMMAND_RELEASE}"},
    (COMMAND_RELEASE, OFF): {COMMAND: f"{BUTTON_1}_{COMMAND_RELEASE}"},
    (COMMAND_RELEASE, CONFIG): {COMMAND: f"{BUTTON_3}_{COMMAND_RELEASE}"},
    (COMMAND_RELEASE, AUX_ON): {COMMAND: f"{BUTTON_5}_{COMMAND_RELEASE}"},
    (COMMAND_RELEASE, AUX_OFF): {COMMAND: f"{BUTTON_4}_{COMMAND_RELEASE}"},
    (COMMAND_RELEASE, AUX_CONFIG): {COMMAND: f"{BUTTON_6}_{COMMAND_RELEASE}"},
}


# QuirkBuilder registration
(
    QuirkBuilder("Inovelli", "VZM32-SN")
    .replaces_endpoint(1, device_type=zha.DeviceType.DIMMABLE_LIGHT)
    .replace_cluster_occurrences(InovelliVZM32SNMMWaveCluster)
    .replace_cluster_occurrences(InovelliVZM32SNCluster)
    .device_automation_triggers(INOVELLI_AUTOMATION_TRIGGERS)
    # Note: Most Number and Switch entities for VZM32SN cluster attributes are auto-created by ZHA
    # from the cluster AttributeDefs. We only declare entities that need explicit configuration
    # or that ZHA doesn't auto-create.
    .number(
        "mmwave_room_size_preset",
        VZM32SN_CLUSTER_ID,
        min_value=0,
        max_value=4,
        step=1,
        entity_type=EntityType.CONFIG,
        translation_key="mmwave_room_size_preset",
        fallback_name="mmWave room size preset",
    )
    .number(
        "light_on_presence_behavior",
        VZM32SN_CLUSTER_ID,
        min_value=0,
        max_value=2,
        step=1,
        entity_type=EntityType.CONFIG,
        translation_key="light_on_presence_behavior",
        fallback_name="Light on presence behavior",
    )
    # Sensor for internal temperature
    .sensor(
        "internal_temp_monitor",
        VZM32SN_CLUSTER_ID,
        entity_type=EntityType.DIAGNOSTIC,
        translation_key="internal_temp_monitor",
        fallback_name="Internal temperature",
    )
    # Binary sensor for overheat protection
    .binary_sensor(
        "overheated",
        VZM32SN_CLUSTER_ID,
        entity_type=EntityType.DIAGNOSTIC,
        translation_key="overheated",
        fallback_name="Overheat protection",
    )
    # Switch for relay click
    .switch(
        "relay_click_in_on_off_mode",
        VZM32SN_CLUSTER_ID,
        off_value=0,
        on_value=1,
        entity_type=EntityType.CONFIG,
        translation_key="relay_click_in_on_off_mode",
        fallback_name="Disable relay click in on/off mode",
    )
    .switch(
        "increased_non_neutral_output",
        VZM32SN_CLUSTER_ID,
        off_value=0,
        on_value=1,
        entity_type=EntityType.CONFIG,
        translation_key="increased_non_neutral_output",
        fallback_name="Non neutral output",
    )
    .switch(
        "remote_protection",
        VZM32SN_CLUSTER_ID,
        off_value=0,
        on_value=1,
        entity_type=EntityType.CONFIG,
        translation_key="remote_protection",
        fallback_name="Remote protection",
    )
    # MMWave cluster entities
    .number(
        "mmwave_z_min",
        MMWAVE_CLUSTER_ID,
        min_value=-32768,
        max_value=32767,
        step=1,
        entity_type=EntityType.CONFIG,
        translation_key="mmwave_z_min",
        fallback_name="mmWave Height Minimum (Floor)",
    )
    .number(
        "mmwave_z_max",
        MMWAVE_CLUSTER_ID,
        min_value=-32768,
        max_value=32767,
        step=1,
        entity_type=EntityType.CONFIG,
        translation_key="mmwave_z_max",
        fallback_name="mmWave Height Maximum (Ceiling)",
    )
    .number(
        "mmwave_x_min",
        MMWAVE_CLUSTER_ID,
        min_value=-32768,
        max_value=32767,
        step=1,
        entity_type=EntityType.CONFIG,
        translation_key="mmwave_x_min",
        fallback_name="mmWave Width Minimum (Left)",
    )
    .number(
        "mmwave_x_max",
        MMWAVE_CLUSTER_ID,
        min_value=-32768,
        max_value=32767,
        step=1,
        entity_type=EntityType.CONFIG,
        translation_key="mmwave_x_max",
        fallback_name="mmWave Width Maximum (Right)",
    )
    .number(
        "mmwave_y_min",
        MMWAVE_CLUSTER_ID,
        min_value=-32768,
        max_value=32767,
        step=1,
        entity_type=EntityType.CONFIG,
        translation_key="mmwave_y_min",
        fallback_name="mmWave Depth Minimum (Near)",
    )
    .number(
        "mmwave_y_max",
        MMWAVE_CLUSTER_ID,
        min_value=-32768,
        max_value=32767,
        step=1,
        entity_type=EntityType.CONFIG,
        translation_key="mmwave_y_max",
        fallback_name="mmWave Depth Maximum (Far)",
    )
    .number(
        "mmwave_detect_sensitivity",
        MMWAVE_CLUSTER_ID,
        min_value=0,
        max_value=2,
        step=1,
        entity_type=EntityType.CONFIG,
        translation_key="mmwave_detect_sensitivity",
        fallback_name="mmWave Detection Sensitivity",
    )
    .number(
        "mmwave_detect_trigger",
        MMWAVE_CLUSTER_ID,
        min_value=0,
        max_value=2,
        step=1,
        entity_type=EntityType.CONFIG,
        translation_key="mmwave_detect_trigger",
        fallback_name="mmWave Detection Delay",
    )
    .number(
        "mmwave_hold_time",
        MMWAVE_CLUSTER_ID,
        min_value=0,
        max_value=4294967295,
        step=1,
        entity_type=EntityType.CONFIG,
        translation_key="mmwave_hold_time",
        fallback_name="mmWave hold time",
    )
    # Target tracking sensors
    .sensor(
        "mmwave_target_count",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_count",
        fallback_name="mmWave Target Count",
    )
    # Target 1
    .sensor(
        "mmwave_target_1_x",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_1_x",
        fallback_name="mmWave Target 1 X",
    )
    .sensor(
        "mmwave_target_1_y",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_1_y",
        fallback_name="mmWave Target 1 Y",
    )
    .sensor(
        "mmwave_target_1_z",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_1_z",
        fallback_name="mmWave Target 1 Z",
    )
    .sensor(
        "mmwave_target_1_speed",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_1_speed",
        fallback_name="mmWave Target 1 Speed",
    )
    .binary_sensor(
        "mmwave_target_1_active",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_1_active",
        fallback_name="mmWave Target 1 Active",
    )
    # Target 2
    .sensor(
        "mmwave_target_2_x",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_2_x",
        fallback_name="mmWave Target 2 X",
    )
    .sensor(
        "mmwave_target_2_y",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_2_y",
        fallback_name="mmWave Target 2 Y",
    )
    .sensor(
        "mmwave_target_2_z",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_2_z",
        fallback_name="mmWave Target 2 Z",
    )
    .sensor(
        "mmwave_target_2_speed",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_2_speed",
        fallback_name="mmWave Target 2 Speed",
    )
    .binary_sensor(
        "mmwave_target_2_active",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_2_active",
        fallback_name="mmWave Target 2 Active",
    )
    # Target 3
    .sensor(
        "mmwave_target_3_x",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_3_x",
        fallback_name="mmWave Target 3 X",
    )
    .sensor(
        "mmwave_target_3_y",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_3_y",
        fallback_name="mmWave Target 3 Y",
    )
    .sensor(
        "mmwave_target_3_z",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_3_z",
        fallback_name="mmWave Target 3 Z",
    )
    .sensor(
        "mmwave_target_3_speed",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_3_speed",
        fallback_name="mmWave Target 3 Speed",
    )
    .binary_sensor(
        "mmwave_target_3_active",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_3_active",
        fallback_name="mmWave Target 3 Active",
    )
    # Target 4
    .sensor(
        "mmwave_target_4_x",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_4_x",
        fallback_name="mmWave Target 4 X",
    )
    .sensor(
        "mmwave_target_4_y",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_4_y",
        fallback_name="mmWave Target 4 Y",
    )
    .sensor(
        "mmwave_target_4_z",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_4_z",
        fallback_name="mmWave Target 4 Z",
    )
    .sensor(
        "mmwave_target_4_speed",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_4_speed",
        fallback_name="mmWave Target 4 Speed",
    )
    .binary_sensor(
        "mmwave_target_4_active",
        MMWAVE_CLUSTER_ID,
        entity_type=EntityType.STANDARD,
        translation_key="mmwave_target_4_active",
        fallback_name="mmWave Target 4 Active",
    )
    .add_to_registry()
)
